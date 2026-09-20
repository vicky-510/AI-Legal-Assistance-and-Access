import { Router } from 'express';
import Contract from '../models/Contract.js';
import Comparison from '../models/Comparison.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizeUserQuestion } from '../utils/sanitize.js';
import { answerQuestion, embedText } from '../services/geminiService.js';
import { cosineSimilarity } from '../services/mongoService.js';
import { buildComparisonChunks } from './documents.js';

const router = Router();

router.use(requireAuth);

const TOP_K = 5;

router.post(
  '/comparison/:comparisonId',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { question } = req.body || {};
    const cleanQuestion = sanitizeUserQuestion(question);
    if (!cleanQuestion) {
      return res.status(400).json({ error: 'A question is required.' });
    }

    const comparison = await Comparison.findOne({
      _id: req.params.comparisonId,
      owner: req.user._id,
    }).select('+chunks +fullTextA +fullTextB');

    if (!comparison) return res.status(404).json({ error: 'Comparison not found.' });

    // Self-heals comparisons saved before Q&A existed on this feature (no
    // stored chunks) by rebuilding them from the retained sanitized text,
    // so opening an old comparison from History doesn't hard-fail chat.
    if (!comparison.chunks?.length) {
      if (!comparison.fullTextA || !comparison.fullTextB) {
        return res.status(422).json({ error: 'This comparison has no retrievable content indexed.' });
      }
      comparison.chunks = await buildComparisonChunks(comparison.fullTextA, comparison.fullTextB);
      await comparison.save();
    }

    const relevantChunks = await retrieveTopChunks(cleanQuestion, comparison.chunks);
    const result = await answerQuestion(cleanQuestion, relevantChunks);

    comparison.chatHistory.push({ role: 'user', content: cleanQuestion });
    comparison.chatHistory.push({
      role: 'assistant',
      content: result.answer,
      citations: result.citations || [],
    });
    await comparison.save();

    res.json(result);
  })
);

// Deletes a question+answer pair ("turn") from a comparison's chat history.
// Messages are stored as consecutive [user, assistant] entries, so a turn
// index maps to array positions [index*2, index*2+1].
router.delete(
  '/comparison/:comparisonId/turns/:turnIndex',
  asyncHandler(async (req, res) => {
    const turnIndex = Number(req.params.turnIndex);
    if (!Number.isInteger(turnIndex) || turnIndex < 0) {
      return res.status(400).json({ error: 'Invalid turn index.' });
    }

    const comparison = await Comparison.findOne({ _id: req.params.comparisonId, owner: req.user._id });
    if (!comparison) return res.status(404).json({ error: 'Comparison not found.' });

    const start = turnIndex * 2;
    if (start >= comparison.chatHistory.length) {
      return res.status(404).json({ error: 'Chat turn not found.' });
    }

    comparison.chatHistory.splice(start, 2);
    await comparison.save();

    res.json({ chatHistory: comparison.chatHistory });
  })
);

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

router.delete(
  '/:contractId/turns/:turnIndex',
  asyncHandler(async (req, res) => {
    const turnIndex = Number(req.params.turnIndex);
    if (!Number.isInteger(turnIndex) || turnIndex < 0) {
      return res.status(400).json({ error: 'Invalid turn index.' });
    }

    const contract = await Contract.findOne({ _id: req.params.contractId, owner: req.user._id });
    if (!contract) return res.status(404).json({ error: 'Contract not found.' });

    const start = turnIndex * 2;
    if (start >= contract.chatHistory.length) {
      return res.status(404).json({ error: 'Chat turn not found.' });
    }

    contract.chatHistory.splice(start, 2);
    await contract.save();

    res.json({ chatHistory: contract.chatHistory });
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
