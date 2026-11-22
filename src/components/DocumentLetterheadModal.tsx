import { useEffect, useState } from 'react';
import { Check, Copy, Download, Printer, X } from 'lucide-react';
import { downloadResolutionPdf } from '../lib/downloadEngine.ts';
import type { LegislativeRecord } from '../lib/portalStore.ts';
import { NNCHSSchoolSeal, SSLGCrest } from './SSLGCrest.tsx';

export interface LetterheadDocumentPayload {
  title: string;
  docCode: string;
  categoryLabel: string;
  dateLabel: string;
  bodyText: string;
  resolutionRecord?: LegislativeRecord;
}

export function DocumentLetterheadModal({
  doc,
  onClose,
  onNotify,
}: {
  doc: LetterheadDocumentPayload;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(doc.bodyText);
      setCopied(true);
      onNotify?.('Resolution text copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = doc.bodyText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        onNotify?.('Resolution text copied to clipboard.');
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const record: LegislativeRecord = doc.resolutionRecord || {
        id: 'doc',
        numberCode: doc.docCode,
        title: doc.title,
        datePassed: doc.dateLabel,
        sponsor: 'NNCHS SSLG Executive Council',
        summary: doc.categoryLabel,
        fullText: doc.bodyText,
      };
      await downloadResolutionPdf(record, onNotify);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={doc.title}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden letterhead-print-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar (hidden on print) */}
        <div className="no-print px-5 py-3.5 bg-[#0f172a] text-white flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-yellow-300 tracking-wide">
              {doc.categoryLabel} · {doc.docCode}
            </p>
            <h3 className="text-sm font-bold text-white truncate">{doc.title}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-yellow-300" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
            <button
              type="button"
              disabled={downloadingPdf}
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#facc15] hover:bg-[#eab308] text-slate-950 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close document preview"
              className="p-1.5 text-slate-300 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Crisp White Letterhead Sheet (immune to Dark Mode) */}
        <div className="flex-1 overflow-y-auto bg-white text-slate-900 p-6 sm:p-10 space-y-6">
          <div className="border-b-2 border-blue-900 pb-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2 shrink-0">
              <NNCHSSchoolSeal className="w-14 h-14" />
              <SSLGCrest className="w-14 h-14" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base sm:text-lg font-extrabold text-blue-950 tracking-tight">
                NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
              </h4>
              <p className="text-xs font-bold text-blue-800 tracking-wide">
                Supreme Secondary Learner Government (NNCHS SSLG) · SY 2026–2027
              </p>
            </div>
            <div className="text-center sm:text-right shrink-0">
              <p className="text-[11px] font-semibold text-slate-500">Reference</p>
              <p className="font-mono-code text-xs font-bold text-blue-950">{doc.docCode}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{doc.dateLabel}</p>
            </div>
          </div>

          {doc.resolutionRecord?.attachedPdfDataUrl ? (
            <div className="space-y-3">
              <iframe
                title={doc.title}
                src={doc.resolutionRecord.attachedPdfDataUrl}
                className="w-full h-[520px] rounded-lg border border-slate-200"
              />
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{doc.title}</h2>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-5">
                {doc.bodyText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
