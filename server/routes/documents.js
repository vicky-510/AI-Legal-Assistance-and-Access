import crypto from 'crypto';
import { Router } from 'express';
import Contract from '../models/Contract.js';
import Comparison from '../models/Comparison.js';
import { uploadPdf } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePdfBuffer, chunkText } from '../services/pdfService.js';
import { sanitizeExtractedText } from '../utils/sanitize.js';
import { summarizeContract, diffContracts, embedBatch } from '../services/geminiService.js';
import { generateContractReport, generateComparisonReport } from '../services/reportService.js';

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

    const comparisonHash = crypto
      .createHash('sha256')
      .update(`${parsedA.documentHash}:${parsedB.documentHash}`)
      .digest('hex');

    const textA = sanitizeExtractedText(parsedA.text);
    const textB = sanitizeExtractedText(parsedB.text);

    const cached = await Comparison.findOne({ owner: req.user._id, comparisonHash }).select('+chunks');
    if (cached) {
      // Backfills chunks for comparisons saved before Q&A chat existed on
      // this feature — otherwise those older cache hits would have no
      // retrievable content and every chat question on them would 422.
      if (!cached.chunks?.length) {
        cached.chunks = await buildComparisonChunks(textA, textB);
        cached.fullTextA = textA;
        cached.fullTextB = textB;
        await cached.save();
      }
      return res.json({ comparison: serializeComparison(cached), cached: true });
    }

    const diff = await diffContracts(textA, textB);
    const embeddedChunks = await buildComparisonChunks(textA, textB);

    const comparison = await Comparison.create({
      owner: req.user._id,
      comparisonHash,
      fileNameA: fileA.originalname,
      fileNameB: fileB.originalname,
      pageCountA: parsedA.pageCount,
      pageCountB: parsedB.pageCount,
      changes: diff.changes,
      overallAssessment: diff.overallAssessment,
      fullTextA: textA,
      fullTextB: textB,
      chunks: embeddedChunks,
    });

    res.status(201).json({ comparison: serializeComparison(comparison), cached: false });
  })
);

export async function buildComparisonChunks(textA, textB) {
  const chunksA = chunkText(textA).map((c) => ({ ...c, source: 'A' }));
  const chunksB = chunkText(textB).map((c) => ({ ...c, source: 'B' }));
  const allChunks = [...chunksA, ...chunksB];

  try {
    const vectors = await embedBatch(allChunks.map((c) => c.text));
    return allChunks.map((c, i) => ({ ...c, embedding: vectors[i] }));
  } catch (err) {
    console.warn('[documents] Comparison embedding failed, chat will use keyword fallback:', err.message);
    return allChunks;
  }
}

router.get(
  '/diffs',
  asyncHandler(async (req, res) => {
    const comparisons = await Comparison.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ comparisons: comparisons.map(serializeComparison) });
  })
);

router.get(
  '/diffs/:id',
  asyncHandler(async (req, res) => {
    const comparison = await Comparison.findOne({ _id: req.params.id, owner: req.user._id });
    if (!comparison) return res.status(404).json({ error: 'Comparison not found.' });
    res.json({ comparison: serializeComparison(comparison) });
  })
);

router.get(
  '/diffs/:id/report',
  asyncHandler(async (req, res) => {
    const comparison = await Comparison.findOne({ _id: req.params.id, owner: req.user._id });
    if (!comparison) return res.status(404).json({ error: 'Comparison not found.' });

    const pdfBuffer = await generateComparisonReport(comparison);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="LexiClear-Comparison-${comparison._id}.pdf"`
    );
    res.send(pdfBuffer);
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

router.get(
  '/:id/report',
  asyncHandler(async (req, res) => {
    const contract = await Contract.findOne({ _id: req.params.id, owner: req.user._id });
    if (!contract) return res.status(404).json({ error: 'Contract not found.' });

    const pdfBuffer = await generateContractReport(serializeContract(contract));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="LexiClear-Analysis-${contract._id}.pdf"`);
    res.send(pdfBuffer);
  })
);

export function serializeComparison(comparison) {
  return {
    id: comparison._id.toString(),
    fileNameA: comparison.fileNameA,
    fileNameB: comparison.fileNameB,
    pageCountA: comparison.pageCountA,
    pageCountB: comparison.pageCountB,
    diff: {
      changes: comparison.changes,
      overallAssessment: comparison.overallAssessment,
    },
    chatHistory: comparison.chatHistory,
    createdAt: comparison.createdAt,
  };
}

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
