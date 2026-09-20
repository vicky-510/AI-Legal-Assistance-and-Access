import { describe, it, expect } from 'vitest';
import { parsePdfBuffer, chunkText, PdfParseError } from '../services/pdfService.js';
import { buildMinimalPdf, buildMultiPagePdf, buildCorruptPdf } from './fixtures/buildTestPdf.js';

describe('pdfService.parsePdfBuffer', () => {
  it('extracts text and page count from a valid single-page PDF', async () => {
    const buffer = await buildMinimalPdf('Hello LexiClear');
    const result = await parsePdfBuffer(buffer);

    expect(result.text).toContain('Hello LexiClear');
    expect(result.pageCount).toBe(1);
    expect(result.documentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('extracts the correct page count from a multi-page PDF', async () => {
    const buffer = await buildMultiPagePdf(['Page one text', 'Page two text', 'Page three text']);
    const result = await parsePdfBuffer(buffer);

    expect(result.pageCount).toBe(3);
    expect(result.text).toContain('Page one text');
    expect(result.text).toContain('Page three text');
  });

  it('rejects an empty buffer', async () => {
    await expect(parsePdfBuffer(Buffer.alloc(0))).rejects.toThrow(PdfParseError);
  });

  it('rejects a non-buffer input', async () => {
    await expect(parsePdfBuffer('not a buffer')).rejects.toThrow(PdfParseError);
  });

  it('rejects a corrupted PDF (invalid magic bytes / structure)', async () => {
    const buffer = Buffer.from('this is definitely not a pdf');
    await expect(parsePdfBuffer(buffer)).rejects.toThrow(PdfParseError);
  });

  it('rejects a file with a corrupt body even if header looks plausible', async () => {
    const buffer = buildCorruptPdf();
    await expect(parsePdfBuffer(buffer)).rejects.toThrow(PdfParseError);
  });

  it('produces a deterministic hash for the same exact bytes', async () => {
    const buffer = await buildMinimalPdf('Same content');
    const resultA = await parsePdfBuffer(buffer);
    const resultB = await parsePdfBuffer(buffer);
    expect(resultA.documentHash).toBe(resultB.documentHash);
  });
});

describe('pdfService.chunkText', () => {
  it('splits long text into overlapping chunks', () => {
    const longText = 'A'.repeat(3000);
    const chunks = chunkText(longText, { chunkSize: 1000, overlap: 100 });

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => {
      expect(c.text.length).toBeLessThanOrEqual(1000);
      expect(c.pageNumber).toBe(1);
    });
  });

  it('assigns increasing page numbers across form-feed page breaks', () => {
    const text = 'Page one content\fPage two content\fPage three content';
    const chunks = chunkText(text);
    const pages = chunks.map((c) => c.pageNumber);
    expect(pages).toEqual([1, 2, 3]);
  });

  it('returns an empty array for blank text', () => {
    expect(chunkText('   \f  \f  ')).toEqual([]);
  });
});
