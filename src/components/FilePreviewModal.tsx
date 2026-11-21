import { Download, ExternalLink, X } from 'lucide-react';

interface FilePreviewModalProps {
  title: string;
  subtitle?: string;
  fileUrl: string;
  downloadUrl?: string;
  mimeType?: string;
  onClose: () => void;
}

export function FilePreviewModal({
  title,
  subtitle,
  fileUrl,
  downloadUrl,
  mimeType,
  onClose,
}: FilePreviewModalProps) {
  const isImage = mimeType?.startsWith('image/');
  const isDocx =
    mimeType?.includes('wordprocessingml') ||
    mimeType?.includes('msword') ||
    fileUrl.toLowerCase().includes('.doc');
  const isExternalDriveLink = fileUrl.startsWith('https://drive.google.com/');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 max-w-5xl w-full h-[88vh] flex flex-col shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-600 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={downloadUrl || fileUrl}
              download
              className="px-3.5 py-2 text-xs font-semibold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Tab</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              aria-label="Close file preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-2">
          {isExternalDriveLink ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                File Stored in Google Drive
              </p>
              <p className="text-xs text-slate-600">
                Open this file in Google Drive or download a copy directly to view and print.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-800 text-white rounded-lg hover:bg-blue-900"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in Google Drive</span>
                </a>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                )}
              </div>
            </div>
          ) : isImage ? (
            <img
              src={fileUrl}
              alt={title}
              className="max-w-full max-h-full object-contain bg-white shadow"
            />
          ) : isDocx ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                Word Document Attachment (.DOC / .DOCX)
              </p>
              <p className="text-xs text-slate-600">
                Browsers cannot render Word files directly inside an inline frame. Click Download above
                to open and print this document in Microsoft Word or LibreOffice.
              </p>
              <a
                href={downloadUrl || fileUrl}
                download
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-blue-800 text-white rounded-lg hover:bg-blue-900"
              >
                <Download className="w-4 h-4" />
                <span>Download Word File</span>
              </a>
            </div>
          ) : (
            <iframe
              src={fileUrl}
              title={title}
              className="w-full h-full bg-white rounded border border-slate-200"
            />
          )}
        </div>
      </div>
    </div>
  );
}
