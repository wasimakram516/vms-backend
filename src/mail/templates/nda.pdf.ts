import PDFDocument from 'pdfkit';

export interface NdaData {
  hostName: string;
  visitorFullName: string;
  visitorOrganisation: string;
  visitorIdNumber: string;
  dateOfVisit: string;
  visitTime: string;
  purpose: string;
}

export function generateNdaPdf(data: NdaData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primaryColor = '#1a3a6b';
    const lineColor = '#cccccc';
    const pageWidth = doc.page.width - 120;

    // ── Header ────────────────────────────────────────────────
    doc.rect(60, 40, pageWidth, 56).fill(primaryColor);
    doc
      .fillColor('#ffffff')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('NON-DISCLOSURE AGREEMENT', 60, 56, { width: pageWidth, align: 'center' });

    doc.y = 112;

    // ── Binding notice ────────────────────────────────────────
    const noticeX = 60;
    const noticeTextX = 70;
    const noticeTextWidth = pageWidth - 20;

    // measure text height at correct font size before drawing
    const noticeText = ` By submitting a premises access permit request via the Sinan Sentry System provided at the entry point of ${data.hostName} ("Company"), the Visitor is deemed to have read, understood, and irrevocably accepted all terms of this Agreement. Submission of the access permit request constitutes the Visitor's binding electronic signature, with full legal effect under the Electronic Transactions Law of the Sultanate of Oman (Royal Decree No. 39/2025). No further act of signature is required.`;
    doc.fontSize(8.5).font('Helvetica');
    const noticeHeight = doc.heightOfString('IMPORTANT — BINDING AGREEMENT:' + noticeText, { width: noticeTextWidth }) + 20;

    doc.rect(noticeX, doc.y, pageWidth, noticeHeight).fillAndStroke('#f0f4ff', '#c0c8e0');
    const noticeY = doc.y + 8;
    doc
      .fillColor('#000000')
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .text('IMPORTANT — BINDING AGREEMENT:', noticeTextX, noticeY, { continued: true })
      .font('Helvetica')
      .text(noticeText, { width: noticeTextWidth });

    doc.y = noticeY + noticeHeight - 8;

    // ── Helper: section heading ───────────────────────────────
    const sectionHeading = (title: string) => {
      doc.moveDown(0.5);
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text(title);
      doc
        .moveTo(60, doc.y + 2)
        .lineTo(60 + pageWidth, doc.y + 2)
        .strokeColor(primaryColor)
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.4);
      doc.fillColor('#000000').font('Helvetica').fontSize(9);
    };

    const body = (text: string) => {
      doc.fontSize(9).font('Helvetica').fillColor('#000000').text(text, { width: pageWidth, align: 'justify' });
      doc.moveDown(0.3);
    };

    const bullet = (text: string) => {
      doc.fontSize(9).font('Helvetica').fillColor('#000000').text(`– ${text}`, { width: pageWidth, indent: 10 });
    };

    // ── Section 1 ─────────────────────────────────────────────
    sectionHeading('1. DEFINITIONS');
    body(
      `"Visitor" means any person who submits an access permit request and enters the Premises. "Premises" means all locations, buildings, facilities, data centres, control rooms, and restricted areas owned or operated by the Company. "Confidential Information" means, in the broadest sense, any and all information the Visitor perceives, obtains, or is exposed to, by any means whatsoever, while on the Premises, including without limitation everything the Visitor sees, hears, reads, accesses, records, or otherwise acquires, encompassing IT and network infrastructure, system architectures, software, hardware, configurations, operational and industrial processes, physical security systems, business data, financial records, personnel and client information, and any other information that a reasonable person would regard as confidential or sensitive in context.`,
    );

    // ── Section 2 ─────────────────────────────────────────────
    sectionHeading('2. VISITOR OBLIGATIONS');
    body('The Visitor agrees to:');
    bullet('Hold all Confidential Information in strict confidence and not disclose it to any third party under any circumstances.');
    bullet('Not reproduce, copy, transmit, publish, photograph, record, or disseminate any Confidential Information in any form or medium.');
    bullet('Not use Confidential Information for any purpose other than the specific, authorised purpose of the visit.');
    bullet('Not photograph, sketch, or document any part of the Premises, equipment, systems, or personnel without prior written Company consent.');
    bullet('Immediately notify the Company of any unauthorised disclosure or use of Confidential Information.');

    // ── Section 3 ─────────────────────────────────────────────
    sectionHeading('3. DURATION');
    body(
      'Obligations commence upon submission of the access permit request and remain in force for five (5) years from the date of visit. Obligations relating to trade secrets or critical infrastructure information are perpetual.',
    );

    // ── Section 4 ─────────────────────────────────────────────
    sectionHeading('4. EXCEPTIONS');
    body(
      "Obligations do not apply to information that the Visitor can demonstrate: (a) was already lawfully in the Visitor's possession prior to the visit; (b) is or becomes publicly known through no breach by the Visitor; or (c) is required to be disclosed by law or court order, provided the Company receives prompt prior written notice and the Visitor cooperates in seeking a protective order.",
    );

    // ── Section 5 ─────────────────────────────────────────────
    sectionHeading('5. INTELLECTUAL PROPERTY, REMEDIES & GOVERNING LAW');
    body(
      "Nothing herein grants the Visitor any licence, right, or interest in the Company's intellectual property. The Visitor acknowledges that any breach may cause irreparable harm, entitling the Company to seek injunctive relief and any other remedy available at law, without bond. This Agreement is governed exclusively by the laws of the Sultanate of Oman, and any disputes shall be subject to the exclusive jurisdiction of the competent Omani courts.",
    );

    // ── Visitor Record header ─────────────────────────────────
    doc.moveDown(0.8);
    const recordHeaderY = doc.y;
    doc.rect(60, recordHeaderY, pageWidth, 16).fill(primaryColor);
    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('VISITOR RECORD', 65, recordHeaderY + 3, { width: pageWidth });

    doc.y = recordHeaderY + 22;

    doc
      .fontSize(8)
      .fillColor('#555555')
      .font('Helvetica-Oblique')
      .text(
        'Acceptance is deemed given electronically upon Sinan Sentry System access permit submission. The Company may log the submission date, time, and device metadata as evidence.',
        { width: pageWidth },
      );

    doc.moveDown(0.6);

    // ── Record table ──────────────────────────────────────────
    const tableTop = doc.y;
    const col1 = 60;
    const col2 = 300;
    const rowH = 22;
    const rows = [
      ['Full Name',          data.visitorFullName,       'Organisation', data.visitorOrganisation],
      ['ID Card / Passport', data.visitorIdNumber,       'Date of Visit', data.dateOfVisit],
      ['Purpose',            data.purpose,               'Host at',       data.visitTime],
    ];

    rows.forEach((row, i) => {
      const y = tableTop + i * rowH;
      if (i % 2 === 0) {
        doc.rect(col1, y, pageWidth, rowH).fill('#f5f7fa');
      }
      doc.strokeColor(lineColor).lineWidth(0.5).rect(col1, y, pageWidth, rowH).stroke();

      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text(row[0] + ':', col1 + 4, y + 7, { width: 100 });
      doc.fillColor('#000000').font('Helvetica').text(row[1] || '—', col1 + 110, y + 7, { width: 160 });

      doc.fillColor(primaryColor).font('Helvetica-Bold').text(row[2] + ':', col2 + 4, y + 7, { width: 100 });
      doc.fillColor('#000000').font('Helvetica').text(row[3] || '—', col2 + 110, y + 7, { width: 140 });
    });

    doc.y = tableTop + rows.length * rowH + 14;

    // ── Footer ────────────────────────────────────────────────
    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(
        'By submitting the access permit request, the Visitor confirms acceptance of this Agreement in its entirety.',
        60, doc.y,
        { width: pageWidth, align: 'center' },
      );

    doc.end();
  });
}
