import crypto from 'crypto';
// pdfjs-dist's "legacy" build runs without a DOM/worker, which is what we
// need for a plain Node.js server process. We previously used `pdf-parse`,
// but it bundles an unmaintained pdf.js snapshot from 2019 that intermittently
// fails ("bad XRef entry") on structurally valid, real-world-shaped PDFs —
// pdfjs-dist is the actively maintained official library and doesn't have
// that problem.
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Point pdfjs-dist at its bundled worker script. Node still runs it via
// worker_threads (not a browser Web Worker), which the legacy build supports.
// createRequire.resolve is used instead of import.meta.resolve because the
// latter isn't supported under Vitest's SSR module transform. The resolved
// path is converted to a file:// URL, required on Windows where a bare
// "E:\..." path isn't accepted by the ESM loader.
const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
).href;

// Standard font fallback data (used when a PDF references a standard font
// like Helvetica without embedding it). In Node, pdfjs-dist's font-data
// factory reads this via fs given a plain directory path — not a file://
// URL, which its fetch-based factory can't read under Node.
const STANDARD_FONT_DATA_URL = require
  .resolve('pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf')
  .replace(/LiberationSans-Regular\.ttf$/, '');

export class PdfParseError extends Error {}

/**
 * Parses a PDF entirely from an in-memory Buffer. Never touches disk.
 * @param {Buffer} buffer - raw PDF bytes (from multer memoryStorage)
 * @returns {Promise<{text: string, pageCount: number, documentHash: string}>}
 */
export async function parsePdfBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new PdfParseError('Empty or invalid file buffer.');
  }

  // Verify actual magic bytes rather than trusting the client-supplied
  // MIME type / filename extension, which can be spoofed.
  const header = buffer.subarray(0, 5).toString('utf8');
  if (header !== '%PDF-') {
    throw new PdfParseError('File is not a valid PDF (magic bytes mismatch).');
  }

  let doc;
  try {
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
    });
    doc = await loadingTask.promise;
  } catch (err) {
    throw new PdfParseError(`Failed to parse PDF: ${err.message}`);
  }

  const pageTexts = [];
  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      pageTexts.push(pageText);
    }
  } catch (err) {
    throw new PdfParseError(`Failed to extract text from PDF: ${err.message}`);
  } finally {
    await doc.destroy();
  }

  const text = pageTexts.join('\f').trim();
  if (!text) {
    throw new PdfParseError('No extractable text found in PDF (empty or scanned/image-only document).');
  }

  const documentHash = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    text,
    pageCount: pageTexts.length,
    documentHash,
  };
}

/**
 * Splits extracted text into overlapping chunks for embedding / RAG retrieval.
 * Page numbers come from the '\f' page-break markers parsePdfBuffer inserts
 * between each page's extracted text.
 */
export function chunkText(text, { chunkSize = 1200, overlap = 150 } = {}) {
  const pages = text.split('\f');
  const chunks = [];
  let chunkIndex = 0;

  pages.forEach((pageText, pageIdx) => {
    const trimmed = pageText.trim();
    if (!trimmed) return;

    let start = 0;
    while (start < trimmed.length) {
      const end = Math.min(start + chunkSize, trimmed.length);
      const slice = trimmed.slice(start, end).trim();
      if (slice) {
        chunks.push({
          text: slice,
          pageNumber: pageIdx + 1,
          chunkIndex: chunkIndex++,
        });
      }
      if (end >= trimmed.length) break;
      start = end - overlap;
    }
  });

  return chunks;
}
