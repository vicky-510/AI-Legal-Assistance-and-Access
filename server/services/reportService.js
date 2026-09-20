import PDFDocument from 'pdfkit';

const RISK_COLORS = {
  HIGH: '#e11d48',
  HIGHER_RISK: '#e11d48',
  MEDIUM: '#d97706',
  LOW: '#059669',
  LOWER_RISK: '#059669',
  NEUTRAL: '#64748b',
  NOT_SPECIFIED_IN_DOCUMENT: '#64748b',
};

function drawHeader(doc, title, subtitle) {
  doc.fillColor('#1e1b4b').fontSize(20).font('Helvetica-Bold').text('LexiClear AI', { continued: false });
  doc.fontSize(10).font('Helvetica').fillColor('#64748b').text('AI-powered legal document intelligence');
  doc.moveDown(1);
  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(doc.x, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text(title);
  if (subtitle) {
    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(subtitle);
  }
  doc.moveDown(1);
}

function drawRiskBadge(doc, level) {
  const color = RISK_COLORS[level] || RISK_COLORS.NEUTRAL;
  doc.fillColor(color).font('Helvetica-Bold').fontSize(9).text(level.replace(/_/g, ' '), { continued: false });
}

function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    doc
      .fontSize(8)
      .fillColor('#94a3b8')
      .font('Helvetica')
      .text(
        'LexiClear AI provides automated document assistance for informational purposes only and does not constitute legal advice.',
        50,
        770,
        { width: 495, align: 'center' }
      );
  }
}

export function generateContractReport(contract) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'Contract Analysis Report', contract.fileName);

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Overall Risk Score: ', { continued: true });
    drawRiskBadge(doc, contract.overallRiskScore);
    doc.moveDown(1);

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Executive Summary');
    doc.moveDown(0.3);
    contract.executiveSummary.forEach((point) => {
      doc.font('Helvetica').fontSize(10).fillColor('#334155').text(`•  ${point}`, { indent: 10 });
    });
    doc.moveDown(1);

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Clause-by-Clause Breakdown');
    doc.moveDown(0.3);

    contract.clauses.forEach((clause) => {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(clause.title, { continued: true });
      doc.text('   ');
      drawRiskBadge(doc, clause.riskLevel);
      doc.font('Helvetica').fontSize(10).fillColor('#334155').text(clause.plainEnglishSummary);
      if (clause.riskReason) {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#64748b').text(`Why: ${clause.riskReason}`);
      }
      doc.font('Helvetica-Oblique').fontSize(9).fillColor('#94a3b8').text(`"${clause.verbatimQuote}"`, {
        indent: 10,
      });
    });

    drawFooter(doc);
    doc.end();
  });
}

export function generateComparisonReport(comparison) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'Contract Comparison Report', `${comparison.fileNameA}  vs  ${comparison.fileNameB}`);

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Overall Assessment');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#334155').text(comparison.overallAssessment);
    doc.moveDown(1);

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Changes');
    doc.moveDown(0.3);

    comparison.changes.forEach((change) => {
      doc.moveDown(0.5);
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0f172a')
        .text(`${change.clauseTitle}  [${change.changeType}]`, { continued: true });
      doc.text('   ');
      drawRiskBadge(doc, change.riskImpact);
      doc.font('Helvetica').fontSize(10).fillColor('#334155').text(change.explanation);
      if (change.verbatimQuoteA) {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#94a3b8').text(`A: "${change.verbatimQuoteA}"`, {
          indent: 10,
        });
      }
      if (change.verbatimQuoteB) {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#94a3b8').text(`B: "${change.verbatimQuoteB}"`, {
          indent: 10,
        });
      }
    });

    drawFooter(doc);
    doc.end();
  });
}
