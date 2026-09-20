import PDFDocument from 'pdfkit';

/**
 * Builds a structurally-valid single-page PDF entirely in memory using
 * pdfkit (a real PDF writer, not hand-rolled bytes — hand-crafted xref
 * tables proved too fragile against the bundled pdf.js parser). Nothing is
 * written to disk, and no binary fixture files are committed to the repo.
 */
export function buildMinimalPdf(text = 'Hello World') {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(12).text(text);
    doc.end();
  });
}

export function buildMultiPagePdf(pagesText) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    pagesText.forEach((text, i) => {
      if (i > 0) doc.addPage();
      doc.fontSize(12).text(text);
    });
    doc.end();
  });
}

export function buildCorruptPdf() {
  return Buffer.from('%PDF-1.4\nthis is not a valid pdf body at all {{{garbage', 'utf8');
}
