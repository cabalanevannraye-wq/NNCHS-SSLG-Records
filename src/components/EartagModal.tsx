import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X } from 'lucide-react';
import type { SSLGDocument, SystemSettings } from '../types.ts';
import { SSLGCrest, formatDateTime } from './SSLGCrest.tsx';

export function EartagPrintableSheet({
  doc,
  settings,
}: {
  doc: SSLGDocument;
  settings: SystemSettings;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const controlStr = doc.controlNumber || 'PENDING-CONTROL-NO';

  useEffect(() => {
    const qrPayload = JSON.stringify({
      ctrl: controlStr,
      title: doc.title,
      org: doc.organizationName,
      date: doc.documentDate,
      type: doc.docType,
    });
    QRCode.toDataURL(qrPayload, { width: 120, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [doc, controlStr]);

  const barcodeBars = controlStr.split('').flatMap((ch, idx) => {
    const code = ch.charCodeAt(0);
    return [
      { w: (code % 3) + 1, gap: (idx % 2) + 1 },
      { w: ((code >> 2) % 2) + 1, gap: 1 },
      { w: ((code >> 4) % 3) + 1, gap: 2 },
    ];
  });

  // Physical routing checkboxes (strictly no Adviser)
  const routingCheckboxes = [
    'Author / Club Submitted',
    'SSLG Officer E-Signed',
    'SSLG President Verified',
    'Printed & Attached',
    'Scanned & Archived',
  ];

  return (
    <div className="bg-white border-2 border-slate-900 rounded-md p-5 max-w-[680px] mx-auto text-slate-900">
      <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-slate-900">
        <div className="flex items-center gap-3">
          <SSLGCrest className="w-11 h-11 shrink-0" />
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
              {settings.organizationHeader} · SY {settings.schoolYear}
            </p>
            <h4 className="text-base font-bold text-slate-950 leading-tight">
              SSLG DOCUMENT ROUTING EARTAG
            </h4>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Control Number</p>
          <p className="font-mono-code text-xl font-bold tracking-tight text-blue-900">
            {controlStr}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 py-3.5 border-b border-slate-300 items-center">
        <div className="col-span-8 space-y-1.5 text-xs">
          <div>
            <span className="text-slate-500 font-semibold">Document Title:</span>
            <p className="font-bold text-sm text-slate-950 leading-snug">{doc.title}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <span className="text-slate-500 font-semibold">Category:</span>
              <p className="font-medium text-slate-900">{doc.category}</p>
            </div>
            <div>
              <span className="text-slate-500 font-semibold">Author / Club:</span>
              <p className="font-medium text-slate-900">{doc.organizationName}</p>
            </div>
            <div>
              <span className="text-slate-500 font-semibold">Date / Time Logged:</span>
              <p className="font-medium text-slate-900 tabular-nums">
                {formatDateTime(doc.createdAt)}
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-semibold">Document Date:</span>
              <p className="font-mono-code font-medium text-slate-900">{doc.documentDate}</p>
            </div>
          </div>
        </div>

        <div className="col-span-4 flex flex-col items-center justify-center border-l border-slate-200 pl-3">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR Code for ${controlStr}`} className="w-24 h-24" />
          ) : (
            <div className="w-24 h-24 bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] text-slate-500">
              QR
            </div>
          )}
          <div className="flex items-end h-5 mt-1.5" aria-hidden="true">
            {barcodeBars.map((b, i) => (
              <span
                key={i}
                className="bg-slate-950 inline-block h-full"
                style={{ width: `${b.w}px`, marginRight: `${b.gap}px` }}
              />
            ))}
          </div>
          <span className="font-mono-code text-[9px] text-slate-700 mt-0.5">{controlStr}</span>
        </div>
      </div>

      <div className="pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700 mb-2">
          Physical Routing &amp; Filing Checklist (Attach to Hardcopy)
        </p>
        <div className="border border-slate-400 rounded overflow-hidden">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 text-left">
                <th className="py-1.5 px-2 font-bold border-r border-slate-300 w-[34%]">
                  Routing Checkpoint
                </th>
                <th className="py-1.5 px-2 font-bold border-r border-slate-300 w-[22%]">
                  Date / Time
                </th>
                <th className="py-1.5 px-2 font-bold border-r border-slate-300 w-[18%]">
                  Status
                </th>
                <th className="py-1.5 px-2 font-bold w-[26%]">Officer Initials</th>
              </tr>
            </thead>
            <tbody>
              {routingCheckboxes.map((label) => (
                <tr key={label} className="border-b last:border-b-0 border-slate-300">
                  <td className="py-2 px-2 font-semibold border-r border-slate-300">{label}</td>
                  <td className="py-2 px-2 border-r border-slate-300 text-slate-400">
                    ___ / ___ : ___
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 text-slate-500">
                    [ ] Done
                  </td>
                  <td className="py-2 px-2" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface EartagModalProps {
  doc: SSLGDocument;
  settings: SystemSettings;
  onClose: () => void;
  onTriggerPrint: () => void;
}

export function EartagModal({
  doc,
  settings,
  onClose,
  onTriggerPrint,
}: EartagModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Stage 3: Printable Document Eartag
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Attach this tag to the printed hardcopy for physical dry-seal and archival filing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 cursor-pointer"
            aria-label="Close eartag preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-slate-100/70">
          <EartagPrintableSheet doc={doc} settings={settings} />
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
            <span>Print Eartag</span>
          </button>
        </div>
      </div>
    </div>
  );
}
