import { jsPDF } from 'jspdf';
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

/**
 * Guaranteed real binary .pdf download for any Official Resolution using jsPDF
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
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 52;
    const contentWidth = pageWidth - margin * 2;
    let y = 52;

    // Blue Header Band + Compre Yellow Accent Line
    doc.setFillColor(30, 58, 138);
    doc.rect(margin, y, contentWidth, 54, 'F');
    doc.setFillColor(250, 204, 21);
    doc.rect(margin, y + 54, contentWidth, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL', margin + 14, y + 22);

    doc.setTextColor(253, 224, 71);
    doc.setFontSize(9.5);
    doc.text('SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)', margin + 14, y + 40);

    y += 82;

    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${record.numberCode}  |  Date Passed: ${record.datePassed}`, margin, y);
    y += 20;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const wrappedTitle = doc.splitTextToSize(record.title, contentWidth) as string[];
    doc.text(wrappedTitle, margin, y);
    y += wrappedTitle.length * 17 + 4;

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Sponsor: ${record.sponsor}`, margin, y);
    y += 22;

    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const bodyText = `${record.summary}\n\n${record.fullText}`.replace(/\r/g, '');
    const paragraphs = bodyText.split('\n');

    for (const para of paragraphs) {
      if (!para.trim()) {
        y += 8;
        continue;
      }
      const lines = doc.splitTextToSize(para, contentWidth) as string[];
      for (const line of lines) {
        if (y > pageHeight - 60) {
          doc.addPage();
          y = 56;
        }
        doc.text(line, margin, y);
        y += 14.5;
      }
    }

    doc.save(targetFilename);
    onNotify?.(`Download started: ${targetFilename}`);
    return true;
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
