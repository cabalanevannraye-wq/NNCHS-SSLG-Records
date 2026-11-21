import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { SSLGDocument } from '../src/types.ts';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.length > 0 ? lines : [''];
}

async function embedOfficialLogo(pdfDoc: PDFDocument) {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'nnchssslglogo.png');
    if (!fs.existsSync(logoPath)) return null;
    const bytes = fs.readFileSync(logoPath);
    return await pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function generateSamplePdfBuffer(params: {
  organizationHeader: string;
  controlNumber: string | null;
  title: string;
  category: string;
  organizationName: string;
  documentDate: string;
  purpose: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  page.drawRectangle({
    x: 48,
    y: PAGE_HEIGHT - 110,
    width: PAGE_WIDTH - 96,
    height: 64,
    color: rgb(0.95, 0.96, 0.98),
    borderColor: rgb(0.12, 0.23, 0.54),
    borderWidth: 1,
  });

  const logoImg = await embedOfficialLogo(pdfDoc);
  if (logoImg) {
    page.drawImage(logoImg, {
      x: 56,
      y: PAGE_HEIGHT - 102,
      width: 48,
      height: 48,
    });
  }

  const headerTextX = logoImg ? 114 : 64;
  page.drawText('SUPREME SECONDARY LEARNER GOVERNMENT (SSLG)', {
    x: headerTextX,
    y: PAGE_HEIGHT - 68,
    size: 11.5,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.54),
  });
  page.drawText(params.organizationHeader.toUpperCase(), {
    x: headerTextX,
    y: PAGE_HEIGHT - 84,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  });
  page.drawText(
    params.controlNumber ? `CTRL: ${params.controlNumber}` : 'CTRL: PENDING E-SIGN',
    {
      x: PAGE_WIDTH - 205,
      y: PAGE_HEIGHT - 74,
      size: 9.5,
      font: fontMono,
      color: rgb(0.12, 0.23, 0.54),
    }
  );

  let y = PAGE_HEIGHT - 148;
  page.drawText(params.category.toUpperCase(), {
    x: 48,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.35, 0.42, 0.52),
  });
  y -= 22;

  for (const line of wrapText(params.title, 54)) {
    page.drawText(line, {
      x: 48,
      y,
      size: 16,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    y -= 20;
  }

  y -= 8;
  page.drawLine({
    start: { x: 48, y },
    end: { x: PAGE_WIDTH - 48, y },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  y -= 22;
  const metaRows = [
    ['Author / Club:', params.organizationName],
    ['Document Date:', params.documentDate],
    ['Control Number:', params.controlNumber || 'To be issued upon E-Signature'],
    ['Category:', params.category],
  ];
  for (const [label, value] of metaRows) {
    page.drawText(label, {
      x: 48,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.28, 0.34, 0.44),
    });
    page.drawText(value, {
      x: 185,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.06, 0.09, 0.16),
    });
    y -= 18;
  }

  y -= 14;
  page.drawText('I. PURPOSE & SUMMARY', {
    x: 48,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.54),
  });
  y -= 18;

  for (const line of wrapText(params.purpose, 82)) {
    page.drawText(line, {
      x: 48,
      y,
      size: 10.5,
      font: fontRegular,
      color: rgb(0.15, 0.2, 0.28),
    });
    y -= 16;
  }

  y -= 14;
  page.drawText('II. STUDENT GOVERNANCE CERTIFICATION', {
    x: 48,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.54),
  });
  y -= 18;

  const bodyText =
    `This official document is submitted by ${params.organizationName} to the Supreme Secondary Learner ` +
    `Government Records System for electronic signature, sequential control number registration, ` +
    `physical eartag routing, and archival filing.`;

  for (const line of wrapText(bodyText, 82)) {
    page.drawText(line, {
      x: 48,
      y,
      size: 10.5,
      font: fontRegular,
      color: rgb(0.15, 0.2, 0.28),
    });
    y -= 16;
  }

  y -= 28;
  page.drawText('Prepared & Submitted By:', {
    x: 48,
    y,
    size: 10,
    font: fontRegular,
    color: rgb(0.35, 0.42, 0.52),
  });
  y -= 34;
  page.drawLine({
    start: { x: 48, y },
    end: { x: 245, y },
    thickness: 0.75,
    color: rgb(0.2, 0.25, 0.35),
  });
  y -= 14;
  page.drawText(params.organizationName, {
    x: 48,
    y,
    size: 9.5,
    font: fontBold,
    color: rgb(0.1, 0.14, 0.22),
  });

  return pdfDoc.save();
}

export async function generateSampleHardcopyScanPdfBuffer(params: {
  organizationHeader: string;
  controlNumber: string;
  title: string;
  organizationName: string;
  documentDate: string;
  wetInkSignatories: string;
}): Promise<Uint8Array> {
  const baseBytes = await generateSamplePdfBuffer({
    organizationHeader: params.organizationHeader,
    controlNumber: params.controlNumber,
    title: params.title,
    category: 'Stage 5 — Scanned Printed & Approved Copy',
    organizationName: params.organizationName,
    documentDate: params.documentDate,
    purpose: `Scanned final hardcopy bearing official stamps and signatures: ${params.wetInkSignatories}.`,
  });

  const pdfDoc = await PDFDocument.load(baseBytes);
  const page = pdfDoc.getPage(0);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 316,
    y: 135,
    width: 248,
    height: 92,
    color: rgb(0.95, 0.99, 0.96),
    borderColor: rgb(0.08, 0.45, 0.24),
    borderWidth: 1.5,
  });

  page.drawText('FINAL HARDCOPY SCANNED & FILED', {
    x: 328,
    y: 208,
    size: 9,
    font: fontBold,
    color: rgb(0.08, 0.45, 0.24),
  });
  page.drawText(`Signatories: ${params.wetInkSignatories.slice(0, 38)}`, {
    x: 328,
    y: 192,
    size: 8,
    font: fontRegular,
    color: rgb(0.15, 0.22, 0.2),
  });

  page.drawLine({
    start: { x: 338, y: 162 },
    end: { x: 382, y: 178 },
    thickness: 1.8,
    color: rgb(0.06, 0.14, 0.48),
  });
  page.drawLine({
    start: { x: 382, y: 178 },
    end: { x: 408, y: 158 },
    thickness: 1.6,
    color: rgb(0.06, 0.14, 0.48),
  });
  page.drawLine({
    start: { x: 408, y: 158 },
    end: { x: 462, y: 172 },
    thickness: 1.5,
    color: rgb(0.06, 0.14, 0.48),
  });

  page.drawText(`Date Finalized: ${params.documentDate}`, {
    x: 328,
    y: 145,
    size: 8,
    font: fontRegular,
    color: rgb(0.25, 0.3, 0.35),
  });

  return pdfDoc.save();
}

export async function stampSignatureOnDocumentPdf(params: {
  sourcePath: string;
  mimeType: string;
  doc: SSLGDocument;
  controlNumber: string;
  signatureDataUrl: string;
  signerName: string;
  signerPosition: string;
  signedAt: string;
}): Promise<Uint8Array | null> {
  let pdfDoc: PDFDocument;

  try {
    const fileBytes = fs.readFileSync(params.sourcePath);
    if (params.mimeType === 'application/pdf' || params.sourcePath.toLowerCase().endsWith('.pdf')) {
      pdfDoc = await PDFDocument.load(fileBytes);
    } else if (
      params.mimeType === 'image/png' ||
      params.mimeType === 'image/jpeg' ||
      /\.(png|jpe?g)$/i.test(params.sourcePath)
    ) {
      pdfDoc = await PDFDocument.create();
      const imgPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const embeddedImg =
        params.mimeType === 'image/png' || params.sourcePath.toLowerCase().endsWith('.png')
          ? await pdfDoc.embedPng(fileBytes)
          : await pdfDoc.embedJpg(fileBytes);
      const maxW = PAGE_WIDTH - 96;
      const maxH = PAGE_HEIGHT - 220;
      const scale = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height, 1);
      const drawW = embeddedImg.width * scale;
      const drawH = embeddedImg.height * scale;
      imgPage.drawImage(embeddedImg, {
        x: (PAGE_WIDTH - drawW) / 2,
        y: PAGE_HEIGHT - 48 - drawH,
        width: drawW,
        height: drawH,
      });
    } else {
      pdfDoc = await PDFDocument.create();
      const certPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      certPage.drawText('SSLG ELECTRONIC SIGNATURE & CONTROL CERTIFICATE', {
        x: 48,
        y: PAGE_HEIGHT - 80,
        size: 13,
        font: fontBold,
        color: rgb(0.12, 0.23, 0.54),
      });
      certPage.drawText(`Control Number: ${params.controlNumber}`, {
        x: 48,
        y: PAGE_HEIGHT - 110,
        size: 11,
        font: fontBold,
        color: rgb(0.06, 0.09, 0.16),
      });
      certPage.drawText(`Document Title: ${params.doc.title}`, {
        x: 48,
        y: PAGE_HEIGHT - 130,
        size: 10.5,
        font: fontRegular,
        color: rgb(0.15, 0.2, 0.28),
      });
      certPage.drawText(`Author / Club: ${params.doc.organizationName}`, {
        x: 48,
        y: PAGE_HEIGHT - 148,
        size: 10.5,
        font: fontRegular,
        color: rgb(0.15, 0.2, 0.28),
      });
      certPage.drawText(`Attached Original File: ${params.doc.fileName}`, {
        x: 48,
        y: PAGE_HEIGHT - 166,
        size: 10,
        font: fontRegular,
        color: rgb(0.35, 0.42, 0.52),
      });
    }

    const pages = pdfDoc.getPages();
    const targetPage = pages[pages.length - 1];
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const base64Part = params.signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const sigBytes = Buffer.from(base64Part, 'base64');
    const sigImage = await pdfDoc.embedPng(sigBytes);

    const slotIndex = params.doc.signatures.length % 3;
    const boxWidth = 164;
    const boxHeight = 82;
    const startX = 48 + slotIndex * (boxWidth + 12);
    const startY = 38;

    targetPage.drawRectangle({
      x: startX,
      y: startY,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0.97, 0.98, 1),
      borderColor: rgb(0.12, 0.23, 0.54),
      borderWidth: 0.9,
    });

    targetPage.drawText(`E-SIGNED · ${params.controlNumber}`, {
      x: startX + 8,
      y: startY + boxHeight - 12,
      size: 6.5,
      font: fontBold,
      color: rgb(0.12, 0.23, 0.54),
    });

    const sigScale = Math.min((boxWidth - 20) / sigImage.width, 32 / sigImage.height);
    targetPage.drawImage(sigImage, {
      x: startX + 10,
      y: startY + 28,
      width: sigImage.width * sigScale,
      height: sigImage.height * sigScale,
    });

    targetPage.drawText(params.signerName.slice(0, 26), {
      x: startX + 8,
      y: startY + 18,
      size: 7.5,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    targetPage.drawText(params.signerPosition.slice(0, 26), {
      x: startX + 8,
      y: startY + 10,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.45),
    });
    targetPage.drawText(
      new Date(params.signedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
      {
        x: startX + 8,
        y: startY + 3,
        size: 6,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.55),
      }
    );

    return await pdfDoc.save();
  } catch (err) {
    console.error('Failed to stamp signature onto PDF:', err);
    return null;
  }
}

export async function compilePeriodicBinderPdf(params: {
  documents: SSLGDocument[];
  uploadsDir: string;
  organizationHeader: string;
  schoolYear: string;
  periodLabel: string;
  categoryLabel: string;
}): Promise<Uint8Array> {
  const compiled = await PDFDocument.create();
  const fontBold = await compiled.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await compiled.embedFont(StandardFonts.Helvetica);
  const fontMono = await compiled.embedFont(StandardFonts.Courier);

  let coverPage = compiled.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  coverPage.drawRectangle({
    x: 48,
    y: PAGE_HEIGHT - 120,
    width: PAGE_WIDTH - 96,
    height: 74,
    color: rgb(0.12, 0.23, 0.54),
  });

  const coverLogo = await embedOfficialLogo(compiled);
  if (coverLogo) {
    coverPage.drawImage(coverLogo, {
      x: 58,
      y: PAGE_HEIGHT - 108,
      width: 50,
      height: 50,
    });
  }

  const coverTitleX = coverLogo ? 118 : 64;
  coverPage.drawText('SUPREME SECONDARY LEARNER GOVERNMENT', {
    x: coverTitleX,
    y: PAGE_HEIGHT - 74,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  coverPage.drawText(`${params.organizationHeader}  |  SY ${params.schoolYear}`, {
    x: coverTitleX,
    y: PAGE_HEIGHT - 94,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.85, 0.9, 1),
  });

  let y = PAGE_HEIGHT - 156;
  coverPage.drawText('DOCUMENT COMPILATION & MASTER INDEX', {
    x: 48,
    y,
    size: 15,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });
  y -= 20;
  coverPage.drawText(
    `Period: ${params.periodLabel}   |   Category: ${params.categoryLabel}   |   Total Records: ${params.documents.length}`,
    {
      x: 48,
      y,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.45),
    }
  );
  y -= 24;

  const drawTableHeader = (pg: typeof coverPage, topY: number) => {
    pg.drawRectangle({
      x: 48,
      y: topY - 18,
      width: PAGE_WIDTH - 96,
      height: 20,
      color: rgb(0.93, 0.95, 0.98),
    });
    pg.drawText('Control No.', { x: 54, y: topY - 12, size: 8, font: fontBold });
    pg.drawText('Date', { x: 145, y: topY - 12, size: 8, font: fontBold });
    pg.drawText('Document Title & Author / Club', { x: 212, y: topY - 12, size: 8, font: fontBold });
    pg.drawText('Stage', { x: 468, y: topY - 12, size: 8, font: fontBold });
  };

  drawTableHeader(coverPage, y);
  y -= 28;

  for (const doc of params.documents) {
    if (y < 70) {
      coverPage = compiled.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 64;
      drawTableHeader(coverPage, y);
      y -= 28;
    }
    coverPage.drawText(doc.controlNumber || 'PENDING', {
      x: 54,
      y,
      size: 8,
      font: fontMono,
      color: rgb(0.12, 0.23, 0.54),
    });
    coverPage.drawText(doc.documentDate, {
      x: 145,
      y,
      size: 8,
      font: fontMono,
      color: rgb(0.25, 0.3, 0.4),
    });
    coverPage.drawText(doc.title.slice(0, 44), {
      x: 212,
      y,
      size: 8.5,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    coverPage.drawText(`${doc.organizationName.slice(0, 30)} · ${doc.category}`, {
      x: 212,
      y: y - 10,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });
    coverPage.drawText(`Stage ${doc.currentStage} of 5`, {
      x: 468,
      y,
      size: 8,
      font: fontRegular,
      color: rgb(0.2, 0.25, 0.35),
    });

    coverPage.drawLine({
      start: { x: 48, y: y - 16 },
      end: { x: PAGE_WIDTH - 48, y: y - 16 },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.94),
    });
    y -= 28;
  }

  for (const doc of params.documents) {
    const activeRel = doc.hardcopyScan?.filePath || doc.signedFilePath || doc.filePath;
    const fullPath = path.join(params.uploadsDir, path.basename(activeRel));
    if (!fs.existsSync(fullPath)) continue;

    const bytes = fs.readFileSync(fullPath);
    const isPdf = activeRel.toLowerCase().endsWith('.pdf');
    const isPng = activeRel.toLowerCase().endsWith('.png');
    const isJpg = /\.(jpe?g)$/i.test(activeRel);

    if (isPdf) {
      try {
        const srcPdf = await PDFDocument.load(bytes);
        const copied = await compiled.copyPages(srcPdf, srcPdf.getPageIndices());
        for (const p of copied) compiled.addPage(p);
      } catch {
        // skip
      }
    } else if (isPng || isJpg) {
      try {
        const page = compiled.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        page.drawText(`${doc.controlNumber || 'PENDING'} — ${doc.title}`, {
          x: 48,
          y: PAGE_HEIGHT - 36,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.25, 0.35),
        });
        const img = isPng ? await compiled.embedPng(bytes) : await compiled.embedJpg(bytes);
        const maxW = PAGE_WIDTH - 96;
        const maxH = PAGE_HEIGHT - 100;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        page.drawImage(img, {
          x: (PAGE_WIDTH - img.width * scale) / 2,
          y: PAGE_HEIGHT - 54 - img.height * scale,
          width: img.width * scale,
          height: img.height * scale,
        });
      } catch {
        // skip
      }
    }
  }

  return compiled.save();
}

export async function compileYearEndHardcopyArchivePdf(params: {
  documents: SSLGDocument[];
  uploadsDir: string;
  organizationHeader: string;
  schoolYear: string;
}): Promise<Uint8Array> {
  const archived = params.documents
    .filter((d) => d.currentStage === 5 && d.hardcopyScan !== null)
    .sort((a, b) => {
      const cA = a.controlNumber || 'ZZZ';
      const cB = b.controlNumber || 'ZZZ';
      return cA.localeCompare(cB);
    });

  type LoadedEntry = {
    doc: SSLGDocument;
    pageCount: number;
    kind: 'pdf' | 'png' | 'jpg';
    bytes: Buffer;
  };
  const entries: LoadedEntry[] = [];

  for (const doc of archived) {
    if (!doc.hardcopyScan) continue;
    const fullPath = path.join(params.uploadsDir, path.basename(doc.hardcopyScan.filePath));
    if (!fs.existsSync(fullPath)) continue;
    const bytes = fs.readFileSync(fullPath);
    const lower = fullPath.toLowerCase();
    if (doc.hardcopyScan.fileMimeType === 'application/pdf' || lower.endsWith('.pdf')) {
      try {
        const loaded = await PDFDocument.load(bytes);
        entries.push({ doc, pageCount: loaded.getPageCount(), kind: 'pdf', bytes });
      } catch {
        // skip
      }
    } else if (doc.hardcopyScan.fileMimeType === 'image/png' || lower.endsWith('.png')) {
      entries.push({ doc, pageCount: 1, kind: 'png', bytes });
    } else if (doc.hardcopyScan.fileMimeType === 'image/jpeg' || /\.(jpe?g)$/i.test(lower)) {
      entries.push({ doc, pageCount: 1, kind: 'jpg', bytes });
    }
  }

  const finalPdf = await PDFDocument.create();
  const fontBold = await finalPdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await finalPdf.embedFont(StandardFonts.Helvetica);
  const fontMono = await finalPdf.embedFont(StandardFonts.CourierBold);

  const cover = finalPdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  cover.drawRectangle({
    x: 42,
    y: 42,
    width: PAGE_WIDTH - 84,
    height: PAGE_HEIGHT - 84,
    borderColor: rgb(0.12, 0.23, 0.54),
    borderWidth: 2,
  });
  cover.drawRectangle({
    x: 52,
    y: 52,
    width: PAGE_WIDTH - 104,
    height: PAGE_HEIGHT - 104,
    borderColor: rgb(0.75, 0.62, 0.25),
    borderWidth: 0.75,
  });

  const archiveLogo = await embedOfficialLogo(finalPdf);
  if (archiveLogo) {
    cover.drawImage(archiveLogo, {
      x: 96,
      y: PAGE_HEIGHT - 142,
      width: 68,
      height: 68,
    });
  }

  cover.drawText(params.organizationHeader.toUpperCase(), {
    x: 96,
    y: PAGE_HEIGHT - 175,
    size: 12,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.45),
  });
  cover.drawText('SUPREME SECONDARY LEARNER GOVERNMENT', {
    x: 96,
    y: PAGE_HEIGHT - 220,
    size: 17,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.54),
  });
  cover.drawText('YEAR-END ARCHIVE OF SIGNED', {
    x: 96,
    y: PAGE_HEIGHT - 280,
    size: 23,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });
  cover.drawText('HARDCOPY RECORDS', {
    x: 96,
    y: PAGE_HEIGHT - 308,
    size: 23,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  cover.drawRectangle({
    x: 96,
    y: PAGE_HEIGHT - 390,
    width: 410,
    height: 54,
    color: rgb(0.95, 0.96, 0.98),
    borderColor: rgb(0.82, 0.86, 0.92),
    borderWidth: 1,
  });
  cover.drawText(`SCHOOL YEAR: ${params.schoolYear}`, {
    x: 116,
    y: PAGE_HEIGHT - 360,
    size: 11,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.54),
  });
  cover.drawText(`Total Stage-5 Archived Documents: ${entries.length}`, {
    x: 116,
    y: PAGE_HEIGHT - 378,
    size: 10,
    font: fontRegular,
    color: rgb(0.25, 0.3, 0.4),
  });

  cover.drawText(`Compiled on ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, {
    x: 96,
    y: 110,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.55),
  });

  const entriesPerTocPage = 20;
  const tocPageCount = Math.max(1, Math.ceil(entries.length / entriesPerTocPage));
  let runningDocStartPage = 1 + tocPageCount + 1;

  for (let t = 0; t < tocPageCount; t++) {
    const tocPage = finalPdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    tocPage.drawText('TABLE OF CONTENTS — SIGNED HARDCOPY ARCHIVE', {
      x: 48,
      y: PAGE_HEIGHT - 60,
      size: 13,
      font: fontBold,
      color: rgb(0.12, 0.23, 0.54),
    });
    tocPage.drawText(`School Year ${params.schoolYear} (Control Number Order)`, {
      x: 48,
      y: PAGE_HEIGHT - 78,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.35, 0.42, 0.52),
    });

    tocPage.drawRectangle({
      x: 48,
      y: PAGE_HEIGHT - 110,
      width: PAGE_WIDTH - 96,
      height: 20,
      color: rgb(0.93, 0.95, 0.98),
    });
    tocPage.drawText('#', { x: 54, y: PAGE_HEIGHT - 104, size: 8, font: fontBold });
    tocPage.drawText('Control No.', { x: 76, y: PAGE_HEIGHT - 104, size: 8, font: fontBold });
    tocPage.drawText('Document Title & Author', { x: 168, y: PAGE_HEIGHT - 104, size: 8, font: fontBold });
    tocPage.drawText('Date', { x: 454, y: PAGE_HEIGHT - 104, size: 8, font: fontBold });
    tocPage.drawText('Page', { x: 530, y: PAGE_HEIGHT - 104, size: 8, font: fontBold });

    let y = PAGE_HEIGHT - 134;
    const slice = entries.slice(t * entriesPerTocPage, (t + 1) * entriesPerTocPage);
    if (slice.length === 0) {
      tocPage.drawText('No Stage 5 scanned hardcopy documents archived yet.', {
        x: 48,
        y,
        size: 10,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.55),
      });
    } else {
      slice.forEach((entry, idx) => {
        const itemNum = t * entriesPerTocPage + idx + 1;
        tocPage.drawText(String(itemNum).padStart(2, '0'), {
          x: 54,
          y,
          size: 8.5,
          font: fontMono,
          color: rgb(0.3, 0.35, 0.45),
        });
        tocPage.drawText(entry.doc.controlNumber || 'UNNUMBERED', {
          x: 76,
          y,
          size: 8.5,
          font: fontMono,
          color: rgb(0.12, 0.23, 0.54),
        });
        tocPage.drawText(entry.doc.title.slice(0, 44), {
          x: 168,
          y,
          size: 8.5,
          font: fontBold,
          color: rgb(0.06, 0.09, 0.16),
        });
        tocPage.drawText(
          `${entry.doc.organizationName} · ${entry.doc.docType === 'accomplishment' ? 'Accomplishment Report' : entry.doc.category}`.slice(0, 56),
          {
            x: 168,
            y: y - 10,
            size: 7.5,
            font: fontRegular,
            color: rgb(0.4, 0.45, 0.55),
          }
        );
        tocPage.drawText(entry.doc.documentDate, {
          x: 454,
          y,
          size: 8,
          font: fontMono,
          color: rgb(0.25, 0.3, 0.4),
        });
        tocPage.drawText(`p. ${runningDocStartPage}`, {
          x: 530,
          y,
          size: 8.5,
          font: fontBold,
          color: rgb(0.06, 0.09, 0.16),
        });

        tocPage.drawLine({
          start: { x: 48, y: y - 16 },
          end: { x: PAGE_WIDTH - 48, y: y - 16 },
          thickness: 0.5,
          color: rgb(0.88, 0.9, 0.94),
        });

        runningDocStartPage += entry.pageCount;
        y -= 30;
      });
    }
  }

  let currentPageNumber = 1 + tocPageCount + 1;
  for (const entry of entries) {
    if (entry.kind === 'pdf') {
      const srcPdf = await PDFDocument.load(entry.bytes);
      const copiedPages = await finalPdf.copyPages(srcPdf, srcPdf.getPageIndices());
      for (const p of copiedPages) {
        p.drawText(
          `SSLG Year-End Hardcopy Archive  |  ${entry.doc.controlNumber || ''}  |  Page ${currentPageNumber}`,
          {
            x: 48,
            y: 18,
            size: 7.5,
            font: fontRegular,
            color: rgb(0.4, 0.45, 0.55),
          }
        );
        finalPdf.addPage(p);
        currentPageNumber++;
      }
    } else {
      const p = finalPdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      p.drawText(
        `HARDCOPY SCAN: ${entry.doc.controlNumber || ''} — ${entry.doc.title.slice(0, 52)}`,
        {
          x: 48,
          y: PAGE_HEIGHT - 38,
          size: 9.5,
          font: fontBold,
          color: rgb(0.12, 0.23, 0.54),
        }
      );
      const img =
        entry.kind === 'png'
          ? await finalPdf.embedPng(entry.bytes)
          : await finalPdf.embedJpg(entry.bytes);
      const maxW = PAGE_WIDTH - 96;
      const maxH = PAGE_HEIGHT - 110;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      p.drawImage(img, {
        x: (PAGE_WIDTH - img.width * scale) / 2,
        y: PAGE_HEIGHT - 56 - img.height * scale,
        width: img.width * scale,
        height: img.height * scale,
      });
      p.drawText(
        `SSLG Year-End Hardcopy Archive  |  ${entry.doc.controlNumber || ''}  |  Page ${currentPageNumber}`,
        {
          x: 48,
          y: 18,
          size: 7.5,
          font: fontRegular,
          color: rgb(0.4, 0.45, 0.55),
        }
      );
      currentPageNumber++;
    }
  }

  return finalPdf.save();
}
