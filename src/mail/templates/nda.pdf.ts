import PDFDocument from 'pdfkit';
import { parse } from 'node-html-parser';
import { renderRichText, cleanRichText } from '../../common/rich-text.renderer.js';

// ── Brand palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary:      '#121922',
  surface:      '#1C242F',
  accentBg:     '#f0f2f5',
  accentBorder: '#c8cdd5',
  line:         '#d8dce2',
};

export interface NdaData {
  heading: string;
  hostName: string;
  visitorFullName: string;
  visitorOrganisation: string;
  visitorIdNumber: string;
  dateOfVisit: string;
  visitTime: string;
  purpose: string;
  preamble: string;
  body: string;
  visitorRecordTitle?: string;
  visitorRecordNote?: string;
  footer?: string;
}

export function generateNdaPdf(data: NdaData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const marginX = 60;
    const pageWidth = doc.page.width - marginX * 2; // 475.28 pt on A4

    // ── Header ────────────────────────────────────────────────
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(COLORS.primary)
      .text(data.heading.toUpperCase(), marginX, marginX, { width: pageWidth, align: 'center' });

    const ruleY = doc.y + 4;
    doc
      .moveTo(marginX, ruleY)
      .lineTo(marginX + pageWidth, ruleY)
      .strokeColor(COLORS.primary)
      .lineWidth(1.5)
      .stroke();

    doc.y = ruleY + 14;

    // ── Preamble ──────────────────────────────────────────────
    renderRichText(doc, data.preamble, marginX, pageWidth);

    // ── Body ──────────────────────────────────────────────────
    doc.moveDown(0.4);
    renderRichText(doc, data.body, marginX, pageWidth);

    // ── Visitor Record header ─────────────────────────────────
    doc.moveDown(0.8);
    const recordHeaderY = doc.y;
    doc.rect(marginX, recordHeaderY, pageWidth, 18).fill(COLORS.primary);
    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(data.visitorRecordTitle || 'VISITOR RECORD', marginX + 6, recordHeaderY + 4, {
        width: pageWidth - 12,
        lineBreak: false,
      });

    doc.y = recordHeaderY + 24;

    if (data.visitorRecordNote) {
      renderRichText(doc, data.visitorRecordNote, marginX, pageWidth);
      doc.moveDown(0.2);
    }

    doc.moveDown(0.4);

    // ── Visitor record table ──────────────────────────────────
    const tableTop = doc.y;
    const colW = pageWidth / 2;
    const rowH = 22;
    const rows: string[][] = [
      ['Full Name',          data.visitorFullName,    'Organisation',  data.visitorOrganisation],
      ['ID Card / Passport', data.visitorIdNumber,    'Date of Visit', data.dateOfVisit],
      ['Purpose',            data.purpose,            'Host at',       data.visitTime],
    ];

    rows.forEach((row, i) => {
      const y = tableTop + i * rowH;
      if (i % 2 === 0) doc.rect(marginX, y, pageWidth, rowH).fill(COLORS.accentBg);
      doc.strokeColor(COLORS.line).lineWidth(0.5).rect(marginX, y, pageWidth, rowH).stroke();

      doc.fillColor(COLORS.surface).fontSize(8).font('Helvetica-Bold')
        .text(row[0] + ':', marginX + 4, y + 7, { width: colW * 0.4, lineBreak: false });
      doc.fillColor('#000000').font('Helvetica')
        .text(row[1] || '—', marginX + colW * 0.4 + 4, y + 7, { width: colW * 0.6 - 8, lineBreak: false });

      doc.fillColor(COLORS.surface).font('Helvetica-Bold')
        .text(row[2] + ':', marginX + colW + 4, y + 7, { width: colW * 0.4, lineBreak: false });
      doc.fillColor('#000000').font('Helvetica')
        .text(row[3] || '—', marginX + colW + colW * 0.4 + 4, y + 7, { width: colW * 0.6 - 8, lineBreak: false });
    });

    doc.y = tableTop + rows.length * rowH + 14;

    // ── Footer ────────────────────────────────────────────────
    if (data.footer) {
      doc.moveDown(0.4);
      renderRichText(doc, data.footer, marginX, pageWidth);
    }

    // ── Page numbers ──────────────────────────────────────────
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    const pageNumY = doc.page.height - (doc.page.margins?.bottom ?? 60) - 12;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(range.start + i);
      doc.fontSize(8).font('Helvetica').fillColor('#aaaaaa')
        .text(`Page ${i + 1} of ${totalPages}`, marginX, pageNumY, {
          width: pageWidth,
          align: 'right',
          lineBreak: false,
        });
    }

    doc.flushPages();
    doc.end();
  });
}
