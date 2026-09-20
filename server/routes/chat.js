import { Router } from 'express';
import Contract from '../models/Contract.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeUserQuestion } from '../utils/sanitize.js';
import { answerQuestion, embedText } from '../services/geminiService.js';
import { cosineSimilarity } from '../services/mongoService.js';

const router = Router();

router.use(requireAuth);

const TOP_K = 5;

router.post(
  '/:contractId',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { question } = req.body || {};
    const cleanQuestion = sanitizeUserQuestion(question);
    if (!cleanQuestion) {
      return res.status(400).json({ error: 'A question is required.' });
    }

    const contract = await Contract.findOne({
      _id: req.params.contractId,
      owner: req.user._id,
    }).select('+chunks');

    if (!contract) return res.status(404).json({ error: 'Contract not found.' });
    if (!contract.chunks?.length) {
      return res.status(422).json({ error: 'This document has no retrievable content indexed.' });
    }

    const relevantChunks = await retrieveTopChunks(cleanQuestion, contract.chunks);
    const result = await answerQuestion(cleanQuestion, relevantChunks);

    contract.chatHistory.push({ role: 'user', content: cleanQuestion });
    contract.chatHistory.push({
      role: 'assistant',
      content: result.answer,
      citations: result.citations || [],
    });
    await contract.save();

    res.json(result);
  })
);

/**
 * Retrieves the top-K most relevant chunks. Prefers Atlas Vector Search
 * ($vectorSearch) via embeddings; if the query embedding call fails
 * (e.g. quota exhausted) it degrades gracefully to a keyword-overlap
 * ranking so chat never hard-fails just because embeddings are down.
 */
async function retrieveTopChunks(question, chunks) {
  try {
    const queryEmbedding = await embedText(question);
    if (queryEmbedding.length && chunks[0]?.embedding?.length) {
      return chunks
        .map((c) => ({ ...c.toObject?.() ?? c, score: cosineSimilarity(queryEmbedding, c.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_K);
    }
  } catch (err) {
    console.warn('[chat] Vector retrieval failed, falling back to keyword match:', err.message);
  }

  const terms = question.toLowerCase().split(/\W+/).filter(Boolean);
  return chunks
    .map((c) => {
      const chunk = c.toObject?.() ?? c;
      const lower = chunk.text.toLowerCase();
      const score = terms.reduce((acc, term) => acc + (lower.includes(term) ? 1 : 0), 0);
      return { ...chunk, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
}

export default router;
