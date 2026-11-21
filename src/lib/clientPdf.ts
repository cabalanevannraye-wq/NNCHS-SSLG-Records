import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { SSLGDocument } from '../types.ts';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

async function fetchSourceBytesForDoc(doc: SSLGDocument, originalBytes?: Uint8Array): Promise<Uint8Array | null> {
  if (originalBytes) return originalBytes;
  return null;
}

export async function clientStampSignaturePdf(params: {
  doc: SSLGDocument;
  controlNumber: string;
  signatureDataUrl: string;
  signerName: string;
  signerPosition: string;
  signedAt: string;
  sourceFileBytes?: Uint8Array;
}): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  const sourceBytes = await fetchSourceBytesForDoc(params.doc, params.sourceFileBytes);

  if (sourceBytes && params.doc.fileMimeType === 'application/pdf') {
    pdfDoc = await PDFDocument.load(sourceBytes);
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
  const binaryStr = atob(base64Part);
  const sigBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    sigBytes[i] = binaryStr.charCodeAt(i);
  }
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

  return pdfDoc.save();
}

export async function clientCompileBinderPdfBlob(params: {
  documents: SSLGDocument[];
  organizationHeader: string;
  schoolYear: string;
  periodLabel: string;
  categoryLabel: string;
}): Promise<Blob> {
  const compiled = await PDFDocument.create();
  const fontBold = await compiled.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await compiled.embedFont(StandardFonts.Helvetica);
  const fontMono = await compiled.embedFont(StandardFonts.Courier);

  let page = compiled.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({
    x: 48,
    y: PAGE_HEIGHT - 120,
    width: PAGE_WIDTH - 96,
    height: 74,
    color: rgb(0.12, 0.23, 0.54),
  });
  page.drawText('SUPREME SECONDARY LEARNER GOVERNMENT', {
    x: 64,
    y: PAGE_HEIGHT - 74,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(`${params.organizationHeader}  |  SY ${params.schoolYear}`, {
    x: 64,
    y: PAGE_HEIGHT - 94,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.85, 0.9, 1),
  });

  let y = PAGE_HEIGHT - 156;
  page.drawText('DOCUMENT COMPILATION & MASTER INDEX', {
    x: 48,
    y,
    size: 15,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });
  y -= 20;
  page.drawText(
    `Period: ${params.periodLabel}   |   Category: ${params.categoryLabel}   |   Total Records: ${params.documents.length}`,
    {
      x: 48,
      y,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.45),
    }
  );
  y -= 28;

  for (const doc of params.documents) {
    if (y < 70) {
      page = compiled.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 64;
    }
    page.drawText(doc.controlNumber || 'PENDING', {
      x: 54,
      y,
      size: 8,
      font: fontMono,
      color: rgb(0.12, 0.23, 0.54),
    });
    page.drawText(doc.documentDate, {
      x: 145,
      y,
      size: 8,
      font: fontMono,
      color: rgb(0.25, 0.3, 0.4),
    });
    page.drawText(doc.title.slice(0, 44), {
      x: 212,
      y,
      size: 8.5,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    page.drawText(`${doc.organizationName.slice(0, 30)} · ${doc.category}`, {
      x: 212,
      y: y - 10,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });
    page.drawText(`Stage ${doc.currentStage} of 5`, {
      x: 468,
      y,
      size: 8,
      font: fontRegular,
      color: rgb(0.2, 0.25, 0.35),
    });
    y -= 28;
  }

  const bytes = await compiled.save();
  return new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' });
}

export async function clientCompileYearEndPdfBlob(params: {
  documents: SSLGDocument[];
  organizationHeader: string;
  schoolYear: string;
}): Promise<Blob> {
  const archived = params.documents
    .filter((d) => d.currentStage === 5 && d.hardcopyScan !== null)
    .sort((a, b) => (a.controlNumber || 'ZZZ').localeCompare(b.controlNumber || 'ZZZ'));

  const finalPdf = await PDFDocument.create();
  const fontBold = await finalPdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await finalPdf.embedFont(StandardFonts.Helvetica);
  const fontMono = await finalPdf.embedFont(StandardFonts.CourierBold);

  const cover = finalPdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  cover.drawText(params.organizationHeader.toUpperCase(), {
    x: 64,
    y: PAGE_HEIGHT - 120,
    size: 12,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.45),
  });
  cover.drawText('SUPREME SECONDARY LEARNER GOVERNMENT', {
    x: 64,
    y: PAGE_HEIGHT - 160,
    size: 17,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.54),
  });
  cover.drawText('YEAR-END ARCHIVE OF SIGNED HARDCOPY RECORDS', {
    x: 64,
    y: PAGE_HEIGHT - 200,
    size: 18,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });
  cover.drawText(`SCHOOL YEAR: ${params.schoolYear} · Archived Docs: ${archived.length}`, {
    x: 64,
    y: PAGE_HEIGHT - 240,
    size: 11,
    font: fontRegular,
    color: rgb(0.25, 0.3, 0.4),
  });

  const tocPage = finalPdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  tocPage.drawText('TABLE OF CONTENTS — SIGNED HARDCOPY ARCHIVE', {
    x: 48,
    y: PAGE_HEIGHT - 60,
    size: 13,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.54),
  });

  let y = PAGE_HEIGHT - 100;
  archived.slice(0, 22).forEach((doc, idx) => {
    tocPage.drawText(`${String(idx + 1).padStart(2, '0')} · ${doc.controlNumber || 'UNNUMBERED'}`, {
      x: 48,
      y,
      size: 8.5,
      font: fontMono,
      color: rgb(0.12, 0.23, 0.54),
    });
    tocPage.drawText(`${doc.title.slice(0, 48)} (${doc.organizationName})`, {
      x: 185,
      y,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.06, 0.09, 0.16),
    });
    y -= 24;
  });

  const bytes = await finalPdf.save();
  return new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' });
}
