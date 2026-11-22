import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type {
  CalendarEventItem,
  LegislativeRecord,
  PrintRequestJob,
} from './portalStore.ts';

function dataUrlToBlob(dataUrl: string, fallbackMime = 'application/octet-stream'): Blob {
  const parts = dataUrl.split(',');
  if (parts.length < 2) {
    return new Blob([], { type: fallbackMime });
  }
  const header = parts[0];
  const base64 = parts[1];
  const mimeMatch = header.match(/data:([^;]+);base64/i);
  const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function triggerBlobOrUriDownload(
  filename: string,
  href: string,
  revokeAfter = false,
  onNotify?: (msg: string) => void
): boolean {
  try {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (revokeAfter) {
      window.setTimeout(() => URL.revokeObjectURL(href), 2500);
    }
    onNotify?.(`Download started: ${filename}`);
    return true;
  } catch {
    onNotify?.('Download blocked by browser preview. Use View & Print as fallback.');
    return false;
  }
}

/**
 * Downloads a learner's uploaded Free Printing file in its EXACT original format and filename
 * (e.g. .pdf, .docx, .png, .jpg) — never converted to .txt.
 */
export function downloadOriginalPrintFile(
  job: PrintRequestJob,
  onNotify?: (msg: string) => void
): boolean {
  if (job.fileDataUrl) {
    try {
      const blob = dataUrlToBlob(job.fileDataUrl, job.fileMimeType);
      const blobUrl = URL.createObjectURL(blob);
      return triggerBlobOrUriDownload(job.fileName || `${job.jobCode}.bin`, blobUrl, true, onNotify);
    } catch {
      return triggerBlobOrUriDownload(
        job.fileName || `${job.jobCode}.bin`,
        job.fileDataUrl,
        false,
        onNotify
      );
    }
  }
  if (job.fileLink) {
    onNotify?.('This job was submitted via an external link — use Open External Link to print.');
    return false;
  }
  onNotify?.('No binary attachment stored on this sample record.');
  return false;
}

function wrapTextLines(text: string, maxChars: number): string[] {
  const paragraphs = text.replace(/\r/g, '').split('\n');
  const lines: string[] = [];
  for (const para of paragraphs) {
    const trimmed = para.trimEnd();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = '';
    for (const w of words) {
      if (!current) {
        current = w;
      } else if (current.length + 1 + w.length <= maxChars) {
        current += ` ${w}`;
      } else {
        lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/**
 * Guaranteed real binary .pdf download for any Official Resolution using pdf-lib
 * (or the admin's uploaded binary .pdf attachment directly).
 */
export async function downloadResolutionPdf(
  record: LegislativeRecord,
  onNotify?: (msg: string) => void
): Promise<boolean> {
  const safeBase = `NNCHS_SSLG_${record.numberCode.replace(/[^a-zA-Z0-9_-]+/g, '_')}`;
  const targetFilename = record.attachedPdfName?.toLowerCase().endsWith('.pdf')
    ? record.attachedPdfName
    : `${safeBase}.pdf`;

  if (record.attachedPdfDataUrl && record.attachedPdfDataUrl.startsWith('data:')) {
    try {
      const blob = dataUrlToBlob(record.attachedPdfDataUrl, 'application/pdf');
      const url = URL.createObjectURL(blob);
      return triggerBlobOrUriDownload(targetFilename, url, true, onNotify);
    } catch {
      return triggerBlobOrUriDownload(targetFilename, record.attachedPdfDataUrl, false, onNotify);
    }
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let page = pdfDoc.addPage([612, 792]); // US Letter
    const { width, height } = page.getSize();
    const margin = 52;
    let y = height - 56;

    // Header Blue Band + Compre Yellow Accent Line
    page.drawRectangle({
      x: margin,
      y: y - 44,
      width: width - margin * 2,
      height: 52,
      color: rgb(30 / 255, 58 / 255, 138 / 255),
    });
    page.drawRectangle({
      x: margin,
      y: y - 48,
      width: width - margin * 2,
      height: 4,
      color: rgb(250 / 255, 204 / 255, 21 / 255),
    });

    page.drawText('NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL', {
      x: margin + 14,
      y: y - 14,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)', {
      x: margin + 14,
      y: y - 31,
      size: 9.5,
      font: fontBold,
      color: rgb(253 / 255, 224 / 255, 71 / 255),
    });

    y -= 72;

    page.drawText(`${record.numberCode}  |  Date Passed: ${record.datePassed}`, {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: rgb(30 / 255, 58 / 255, 138 / 255),
    });
    y -= 18;

    const titleLines = wrapTextLines(record.title, 76);
    for (const tl of titleLines) {
      page.drawText(tl, {
        x: margin,
        y,
        size: 13,
        font: fontBold,
        color: rgb(15 / 255, 23 / 255, 42 / 255),
      });
      y -= 17;
    }

    page.drawText(`Sponsor: ${record.sponsor}`, {
      x: margin,
      y: y - 2,
      size: 9.5,
      font: fontRegular,
      color: rgb(71 / 255, 85 / 255, 105 / 255),
    });
    y -= 24;

    const bodyLines = wrapTextLines(`${record.summary}\n\n${record.fullText}`, 86);
    for (const line of bodyLines) {
      if (y < 60) {
        page = pdfDoc.addPage([612, 792]);
        y = page.getSize().height - 54;
      }
      if (line) {
        page.drawText(line, {
          x: margin,
          y,
          size: 10,
          font: fontRegular,
          color: rgb(30 / 255, 41 / 255, 59 / 255),
        });
      }
      y -= 14;
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return triggerBlobOrUriDownload(targetFilename, url, true, onNotify);
  } catch {
    onNotify?.('PDF generation encountered an issue. Opening printable letterhead instead.');
    return false;
  }
}

export function generateCalendarIcs(event: CalendarEventItem): string {
  const dt = event.date.replace(/-/g, '');
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NNCHS SSLG//Activity Calendar//EN
BEGIN:VEVENT
UID:${event.id}@sslgnnchs26.site
DTSTART;VALUE=DATE:${dt}
SUMMARY:${event.title}
LOCATION:${event.venue}
DESCRIPTION:${event.description} (${event.timeRange})
END:VEVENT
END:VCALENDAR`;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/calendar;charset=utf-8',
  onNotify?: (msg: string) => void
): boolean {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  return triggerBlobOrUriDownload(filename, url, true, onNotify);
}
