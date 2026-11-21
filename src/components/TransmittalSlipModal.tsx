import { Printer, X } from 'lucide-react';
import type { SSLGDocument, SystemSettings } from '../types.ts';
import { SSLGCrest, formatDateTime } from './SSLGCrest.tsx';

export function TransmittalPrintableSheet({
  documents,
  settings,
  fromLabel,
  toLabel,
}: {
  documents: SSLGDocument[];
  settings: SystemSettings;
  fromLabel: string;
  toLabel: string;
}) {
  return (
    <div className="bg-white border border-slate-300 rounded-md p-6 max-w-[780px] mx-auto text-slate-900">
      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <SSLGCrest className="w-11 h-11 shrink-0" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {settings.organizationHeader} · SY {settings.schoolYear}
            </p>
            <h4 className="text-lg font-bold text-slate-950">
              SSLG DOCUMENT TRANSMITTAL SLIP
            </h4>
          </div>
        </div>
        <div className="text-right text-xs">
          <p className="text-slate-500">Generated</p>
          <p className="font-semibold tabular-nums">{formatDateTime(new Date().toISOString())}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 border border-slate-200 rounded p-3 mb-4">
        <div>
          <span className="text-slate-500 font-semibold">Transmitted By / Origin:</span>
          <p className="font-bold text-slate-900 text-sm mt-0.5">{fromLabel}</p>
        </div>
        <div>
          <span className="text-slate-500 font-semibold">Receiving Office / Custodian:</span>
          <p className="font-bold text-slate-900 text-sm mt-0.5">{toLabel}</p>
        </div>
      </div>

      <table className="w-full text-xs border-collapse border border-slate-300 mb-6">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300 text-left">
            <th className="py-2 px-2.5 font-bold border-r border-slate-300">#</th>
            <th className="py-2 px-2.5 font-bold border-r border-slate-300">Control No.</th>
            <th className="py-2 px-2.5 font-bold border-r border-slate-300">Document Title</th>
            <th className="py-2 px-2.5 font-bold border-r border-slate-300">Category</th>
            <th className="py-2 px-2.5 font-bold">Author / Club</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, idx) => (
            <tr key={doc.id} className="border-b border-slate-200">
              <td className="py-2 px-2.5 border-r border-slate-300 tabular-nums">{idx + 1}</td>
              <td className="py-2 px-2.5 border-r border-slate-300 font-mono-code font-semibold text-blue-900">
                {doc.controlNumber || 'Pending E-Sign'}
              </td>
              <td className="py-2 px-2.5 border-r border-slate-300 font-medium">{doc.title}</td>
              <td className="py-2 px-2.5 border-r border-slate-300">{doc.category}</td>
              <td className="py-2 px-2.5">{doc.organizationName}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-8 pt-4 text-xs">
        <div>
          <p className="font-semibold text-slate-700 mb-8">Endorsed / Passed By:</p>
          <div className="border-t border-slate-800 pt-1">
            <p className="font-bold">Signature over Printed Name</p>
            <p className="text-slate-500">Date &amp; Time Passed: _____________________</p>
          </div>
        </div>
        <div>
          <p className="font-semibold text-slate-700 mb-8">Received &amp; Acknowledged By:</p>
          <div className="border-t border-slate-800 pt-1">
            <p className="font-bold">Signature over Printed Name</p>
            <p className="text-slate-500">Date &amp; Time Received: ___________________</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TransmittalSlipModalProps {
  documents: SSLGDocument[];
  settings: SystemSettings;
  fromLabel: string;
  toLabel: string;
  onClose: () => void;
  onTriggerPrint: () => void;
}

export function TransmittalSlipModal({
  documents,
  settings,
  fromLabel,
  toLabel,
  onClose,
  onTriggerPrint,
}: TransmittalSlipModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Printable Transmittal Slip ({documents.length}{' '}
              {documents.length === 1 ? 'Document' : 'Documents'})
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Official handoff receipt for single or batch document transmittal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 cursor-pointer"
            aria-label="Close transmittal slip preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-slate-100/70 max-h-[70vh] overflow-y-auto">
          <TransmittalPrintableSheet
            documents={documents}
            settings={settings}
            fromLabel={fromLabel}
            toLabel={toLabel}
          />
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onTriggerPrint}
            className="px-5 py-2.5 text-sm font-semibold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Transmittal Slip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
