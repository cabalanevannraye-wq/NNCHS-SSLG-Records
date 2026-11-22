import type {
  CalendarEventItem,
  GrievanceTicket,
  LedgerEntry,
  LegislativeRecord,
  PrintRequestJob,
} from './portalStore.ts';

function csvEscape(value: string | number | boolean): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Sandboxed-iframe-safe file download helper.
 * Uses RFC 2397 data URI first (works cleanly inside nested iframes where blob URLs
 * may be restricted) with Blob/msSaveBlob fallback and toast notification.
 */
export function downloadFileSafe(
  filename: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8',
  onNotify?: (message: string) => void
): boolean {
  try {
    const cleanContent = content.startsWith('\uFEFF') ? content : `\uFEFF${content}`;
    const encodedUri = `data:${mimeType},${encodeURIComponent(cleanContent)}`;
    const link = document.createElement('a');
    link.href = encodedUri;
    link.setAttribute('download', filename);
    link.setAttribute('target', '_blank');
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify?.(`Download started: ${filename}`);
    return true;
  } catch {
    try {
      const blob = new Blob([content], { type: mimeType });
      const navWithMs = navigator as Navigator & {
        msSaveOrOpenBlob?: (b: Blob, name?: string) => boolean;
      };
      if (typeof navWithMs.msSaveOrOpenBlob === 'function') {
        navWithMs.msSaveOrOpenBlob(blob, filename);
        onNotify?.(`Download started: ${filename}`);
        return true;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      onNotify?.(`Download started: ${filename}`);
      return true;
    } catch {
      onNotify?.('Automatic download blocked in preview. Use "View & Save as PDF" instead.');
      return false;
    }
  }
}

export function buildDataUri(
  content: string,
  mimeType = 'text/plain;charset=utf-8'
): string {
  return `data:${mimeType},${encodeURIComponent(content)}`;
}

export function generateResolutionText(record: LegislativeRecord): string {
  return `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)
Nabunturan, Davao de Oro · Schools Division of Davao de Oro
====================================================================
${record.docKind.toUpperCase()}: ${record.numberCode}
TITLE: ${record.title}
DATE PASSED / ISSUED: ${record.datePassed}
SPONSOR / AUTHOR: ${record.sponsor}
STATUS: ${record.status}
====================================================================

SUMMARY:
${record.summary}

OFFICIAL TEXT:
${record.fullText}

====================================================================
Authenticated via NNCHS SSLG Digital Transparency Archive
`;
}

export function generateTicketReceiptText(ticket: GrievanceTicket): string {
  return `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)
PUBLIC STUDENT REPORTING & WELFARE DESK · OFFICIAL RECEIPT
====================================================================
TRACKING ID: ${ticket.ticketCode}
CURRENT STATUS: ${ticket.status}
SUBMITTED ON: ${new Date(ticket.submittedAt).toLocaleString('en-PH')}
LAST UPDATED: ${new Date(ticket.updatedAt).toLocaleString('en-PH')}
--------------------------------------------------------------------
REPORTER IDENTITY: ${ticket.isAnonymous ? 'ANONYMOUS (Protected)' : ticket.studentName}
GRADE & SECTION:   ${ticket.isAnonymous ? 'Undisclosed' : ticket.gradeSection}
CATEGORY:          ${ticket.category}
SUBJECT:           ${ticket.subject}
--------------------------------------------------------------------
REPORT DETAILS:
${ticket.details}

OFFICIAL SSLG REMARKS:
${ticket.publicRemarks}
====================================================================
Keep your Tracking ID (${ticket.ticketCode}) to verify resolution progress
anytime on the NNCHS SSLG Public Ticket Status Checker.
`;
}

export function generatePrintReceiptText(job: PrintRequestJob): string {
  return `NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
SUPREME SECONDARY LEARNER GOVERNMENT (NNCHS SSLG)
PROJECT LIBRE-PRINT · FREE PRINTING QUEUE RECEIPT
====================================================================
PRINT JOB CODE: ${job.jobCode}
STATUS:         ${job.status}
STUDENT:        ${job.studentName} (${job.gradeSection})
PURPOSE:        ${job.purpose}
DOCUMENT TITLE: ${job.documentTitle}
ATTACHMENT REF: ${job.attachmentReference || 'To be presented at Room 104'}
PAGE COUNT:     ${job.pageCount} page(s) · ${job.printMode}
CLAIM SLOT:     ${job.claimSlot} (SSLG Office, Room 104)
SMS ALERT SENT: ${job.smsDispatched ? 'Yes -> SSLG Admin (09163866252)' : 'Queued'}
SUBMITTED AT:   ${new Date(job.submittedAt).toLocaleString('en-PH')}
====================================================================
Present your School ID and Job Code (${job.jobCode}) when claiming.
`;
}

export function generateLedgerCsv(entries: LedgerEntry[]): string {
  const headers = [
    'Date',
    'Voucher No.',
    'Committee / Source',
    'Particulars',
    'Entry Type',
    'Amount (PHP)',
    'Liquidation Status',
  ];
  const rows = entries.map((e) =>
    [
      csvEscape(e.date),
      csvEscape(e.voucherNo),
      csvEscape(e.committee),
      csvEscape(e.particulars),
      csvEscape(e.entryType),
      csvEscape(e.amount.toFixed(2)),
      csvEscape(e.liquidationStatus),
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function generatePrintQueueCsv(jobs: PrintRequestJob[]): string {
  const headers = [
    'Job Code',
    'Student Name',
    'Grade & Section',
    'Contact Number',
    'Purpose',
    'Document Title',
    'Pages',
    'Print Mode',
    'Claim Slot',
    'Status',
    'SMS Alert Sent',
    'Submitted At',
  ];
  const rows = jobs.map((j) =>
    [
      csvEscape(j.jobCode),
      csvEscape(j.studentName),
      csvEscape(j.gradeSection),
      csvEscape(j.contactNumber || 'N/A'),
      csvEscape(j.purpose),
      csvEscape(j.documentTitle),
      csvEscape(j.pageCount),
      csvEscape(j.printMode),
      csvEscape(j.claimSlot),
      csvEscape(j.status),
      csvEscape(j.smsDispatched ? 'Yes (09163866252)' : 'Pending'),
      csvEscape(j.submittedAt),
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function generateCalendarIcs(event: CalendarEventItem): string {
  const dt = event.date.replace(/-/g, '');
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NNCHS SSLG//Official School Calendar//EN
BEGIN:VEVENT
UID:${event.id}@sslgnnchs26.site
DTSTART;VALUE=DATE:${dt}
SUMMARY:${event.title}
LOCATION:${event.venue}
DESCRIPTION:${event.description} (${event.timeRange} - Organized by ${event.organizer})
END:VEVENT
END:VCALENDAR`;
}
