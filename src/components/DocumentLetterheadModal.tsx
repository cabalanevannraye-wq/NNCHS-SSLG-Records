import { useEffect, useState } from 'react';
import { Check, Copy, Download, Printer, X } from 'lucide-react';
import { buildDataUri, downloadFileSafe } from '../lib/downloadEngine.ts';
import { SSLGCrest } from './SSLGCrest.tsx';

export interface LetterheadDocumentPayload {
  title: string;
  docCode: string;
  categoryLabel: string;
  dateLabel: string;
  filename: string;
  bodyText: string;
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
      onNotify?.('Document text copied to clipboard.');
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
        onNotify?.('Document text copied to clipboard.');
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const dataUriHref = buildDataUri(doc.bodyText);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={doc.title}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden letterhead-print-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action Bar (hidden when printing) */}
        <div className="no-print px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
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
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Full Text'}</span>
            </button>
            <button
              type="button"
              onClick={() => downloadFileSafe(doc.filename, doc.bodyText, 'text/plain;charset=utf-8', onNotify)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .TXT</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
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

        {/* Always-White Formal Official Letterhead Paper Sheet */}
        <div className="flex-1 overflow-y-auto bg-white text-slate-900 p-6 sm:p-10 space-y-6">
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <SSLGCrest className="w-16 h-16 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Republic of the Philippines · Department of Education · Region XI
              </p>
              <p className="text-sm font-bold text-slate-900">
                Schools Division of Davao de Oro · Nabunturan West District
              </p>
              <h4 className="text-base sm:text-lg font-extrabold text-blue-950 tracking-tight">
                NABUNTURAN NATIONAL COMPREHENSIVE HIGH SCHOOL
              </h4>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Supreme Secondary Learner Government (NNCHS SSLG) · SY 2026–2027
              </p>
            </div>
            <div className="text-center sm:text-right shrink-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Reference Code</p>
              <p className="font-mono-code text-xs font-bold text-slate-900">{doc.docCode}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{doc.dateLabel}</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">{doc.title}</h2>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-5">
              {doc.bodyText}
            </pre>
          </div>

          <div className="no-print pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Tip: Click "Print / Save as PDF" and choose "Save as PDF" as your destination printer.</span>
            <a
              href={dataUriHref}
              download={doc.filename}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-800 hover:underline"
            >
              Direct File Link ({doc.filename})
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
