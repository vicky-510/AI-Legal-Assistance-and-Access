import { Router } from 'express';
import Contract from '../models/Contract.js';
import { uploadPdf } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePdfBuffer, chunkText } from '../services/pdfService.js';
import { sanitizeExtractedText } from '../utils/sanitize.js';
import { summarizeContract, diffContracts, embedBatch } from '../services/geminiService.js';

const router = Router();

router.use(requireAuth);

// Feature 1: upload + analyze a single contract, with per-user response caching
// keyed by document hash so re-analyzing the same file costs 0 Gemini tokens.
router.post(
  '/analyze',
  aiLimiter,
  uploadPdf.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'A PDF file is required (field name "file").' });
    }

    const { text, pageCount, documentHash } = await parsePdfBuffer(req.file.buffer);
    const cleanText = sanitizeExtractedText(text);

    const cached = await Contract.findOne({ owner: req.user._id, documentHash }).select('+fullText +chunks');
    if (cached) {
      return res.json({ contract: serializeContract(cached), cached: true });
    }

    const analysis = await summarizeContract(cleanText);
    const chunks = chunkText(cleanText);

    let embeddedChunks = chunks;
    try {
      const vectors = await embedBatch(chunks.map((c) => c.text));
      embeddedChunks = chunks.map((c, i) => ({ ...c, embedding: vectors[i] }));
    } catch (err) {
      console.warn('[documents] Embedding generation failed, chat will use keyword fallback:', err.message);
    }

    const contract = await Contract.create({
      owner: req.user._id,
      fileName: req.file.originalname,
      documentHash,
      pageCount,
      fullText: cleanText,
      executiveSummary: analysis.executiveSummary,
      overallRiskScore: analysis.overallRiskScore,
      clauses: analysis.clauses,
      chunks: embeddedChunks,
    });

    // req.file.buffer is only referenced above; nothing retains it after this
    // handler returns, so the raw upload buffer is eligible for GC immediately.
    res.status(201).json({ contract: serializeContract(contract), cached: false });
  })
);

// Feature 2: side-by-side semantic diff between two contract versions.
router.post(
  '/diff',
  aiLimiter,
  uploadPdf.fields([
    { name: 'fileA', maxCount: 1 },
    { name: 'fileB', maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const fileA = req.files?.fileA?.[0];
    const fileB = req.files?.fileB?.[0];
    if (!fileA || !fileB) {
      return res.status(400).json({ error: 'Both fileA and fileB PDF uploads are required.' });
    }

    const [parsedA, parsedB] = await Promise.all([
      parsePdfBuffer(fileA.buffer),
      parsePdfBuffer(fileB.buffer),
    ]);

    const textA = sanitizeExtractedText(parsedA.text);
    const textB = sanitizeExtractedText(parsedB.text);

    const diff = await diffContracts(textA, textB);

    res.json({
      diff,
      meta: {
        fileNameA: fileA.originalname,
        fileNameB: fileB.originalname,
        pageCountA: parsedA.pageCount,
        pageCountB: parsedB.pageCount,
      },
    });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const contracts = await Contract.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ contracts: contracts.map(serializeContract) });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const contract = await Contract.findOne({ _id: req.params.id, owner: req.user._id });
    if (!contract) return res.status(404).json({ error: 'Contract not found.' });
    res.json({ contract: serializeContract(contract) });
  })
);

export function serializeContract(contract) {
  return {
    id: contract._id.toString(),
    fileName: contract.fileName,
    pageCount: contract.pageCount,
    executiveSummary: contract.executiveSummary,
    overallRiskScore: contract.overallRiskScore,
    clauses: contract.clauses,
    chatHistory: contract.chatHistory,
    createdAt: contract.createdAt,
  };
}

export default router;
