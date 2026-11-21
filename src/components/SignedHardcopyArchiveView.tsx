import React, { useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileUp,
  HardDrive,
  Printer,
  ScanLine,
  Tag,
} from 'lucide-react';
import { connectGoogleDriveWithPopup, getGoogleDriveAccessToken } from '../firebase.ts';
import { api, getHardcopyFileUrl } from '../lib/api.ts';
import { firebaseService } from '../lib/firebaseService.ts';
import { uploadBlobToGoogleDrive } from '../lib/googleDrive.ts';
import type { SSLGDocument, SystemSettings, UserAccount } from '../types.ts';
import { formatDateTime } from './SSLGCrest.tsx';

interface SignedHardcopyArchiveViewProps {
  documents: SSLGDocument[];
  currentUser: UserAccount;
  settings: SystemSettings;
  onDocumentUpdated: (doc: SSLGDocument) => void;
  onOpenYearEndPdf: (url: string, title: string) => void;
  onPreviewHardcopy: (doc: SSLGDocument) => void;
  onPrintEartag: (doc: SSLGDocument) => void;
}

export function SignedHardcopyArchiveView({
  documents,
  currentUser,
  settings,
  onDocumentUpdated,
  onOpenYearEndPdf,
  onPreviewHardcopy,
  onPrintEartag,
}: SignedHardcopyArchiveViewProps) {
  const [moduleFilter, setModuleFilter] = useState<'ALL' | 'general' | 'accomplishment'>('ALL');
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  // Documents in Stage 3 or Stage 4 ready for Stage 5 final scan upload
  const readyForStage5 = useMemo(
    () => documents.filter((d) => d.currentStage === 3 || d.currentStage === 4),
    [documents]
  );

  const [targetDocId, setTargetDocId] = useState<string>(readyForStage5[0]?.id || '');
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [wetInkSignatories, setWetInkSignatories] = useState(
    'SSLG President & Officers'
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const archivedDocs = useMemo(() => {
    return documents
      .filter((d) => {
        if (d.currentStage !== 5 || !d.hardcopyScan) return false;
        if (moduleFilter !== 'ALL' && d.docType !== moduleFilter) return false;
        return true;
      })
      .sort((a, b) => (a.controlNumber || 'ZZZ').localeCompare(b.controlNumber || 'ZZZ'));
  }, [documents, moduleFilter]);

  const [compilingYearEnd, setCompilingYearEnd] = useState(false);
  const [savingToDrive, setSavingToDrive] = useState(false);
  const [driveArchiveLink, setDriveArchiveLink] = useState<string | null>(null);
  const canUpload = currentUser.role === 'admin' || currentUser.role === 'officer';

  const handleOpenYearEnd = async () => {
    setCompilingYearEnd(true);
    try {
      const blob = await api.compileYearEndPdfBlob({
        documents,
        organizationHeader: settings.organizationHeader,
        schoolYear: settings.schoolYear,
      });
      const blobUrl = URL.createObjectURL(blob);
      onOpenYearEndPdf(
        blobUrl,
        `Full School Year Hardcopy Archive (${settings.schoolYear})`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compile Year-End PDF');
    } finally {
      setCompilingYearEnd(false);
    }
  };

  const handleDownloadYearEnd = async () => {
    setCompilingYearEnd(true);
    try {
      const blob = await api.compileYearEndPdfBlob({
        documents,
        organizationHeader: settings.organizationHeader,
        schoolYear: settings.schoolYear,
      });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `SSLG_YearEnd_Hardcopy_Archive_${settings.schoolYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download Year-End PDF');
    } finally {
      setCompilingYearEnd(false);
    }
  };

  const handleSaveYearEndToDrive = async () => {
    setError('');
    setSuccessMsg('');
    setDriveArchiveLink(null);
    setSavingToDrive(true);
    try {
      if (!getGoogleDriveAccessToken()) {
        await connectGoogleDriveWithPopup();
      }
      const blob = await api.compileYearEndPdfBlob({
        documents,
        organizationHeader: settings.organizationHeader,
        schoolYear: settings.schoolYear,
      });
      const uploaded = await uploadBlobToGoogleDrive({
        blob,
        fileName: `SSLG_YearEnd_Hardcopy_Archive_${settings.schoolYear}.pdf`,
        mimeType: 'application/pdf',
      });
      const link =
        uploaded.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(uploaded.id)}/view`;
      setDriveArchiveLink(link);
      setSuccessMsg(`Year-End Hardcopy Archive (${settings.schoolYear}) saved to Google Drive.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Year-End archive to Google Drive');
    } finally {
      setSavingToDrive(false);
    }
  };

  const handleStage5Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const docId = targetDocId || readyForStage5[0]?.id;
    const targetDoc = readyForStage5.find((d) => d.id === docId);
    if (!targetDoc) {
      setError('No Stage 3 or Stage 4 documents waiting for final scan upload.');
      return;
    }
    if (!scanFile) {
      setError('Please attach the scanned PDF or photo (JPG/PNG) of the printed copy.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const updated = await firebaseService.uploadHardcopyScanForDoc(
        targetDoc,
        currentUser,
        documents,
        {
          file: scanFile,
          wetInkSignatories,
          notes,
        }
      );
      onDocumentUpdated(updated);
      setScanFile(null);
      setNotes('');
      setShowUploadPanel(false);
      setSuccessMsg(
        `${updated.controlNumber || updated.title} is now Stage 5 (100% Completed & Archived).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload scanned hardcopy');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1-Click Year-End Compilation Header */}
      <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <BookOpenCheck className="w-4 h-4" />
            <span>School Year {settings.schoolYear} · Stage 5 Completed Records</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Signed Hardcopy Scans &amp; Year-End Archive
          </h2>
          <p className="text-sm text-slate-300">
            Automatically collects every General Document and Accomplishment Report that has reached
            Stage 5 (Scanned Printed/Approved Copy). Bundle the entire school year in one click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {canUpload && (
            <button
              type="button"
              onClick={() => setShowUploadPanel((v) => !v)}
              className="px-4 py-3 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <ScanLine className="w-4 h-4" />
              <span>{showUploadPanel ? 'Close Uploader' : 'Upload Stage 5 Scan'}</span>
            </button>
          )}
          <button
            type="button"
            disabled={compilingYearEnd || savingToDrive}
            onClick={handleSaveYearEndToDrive}
            className="px-4 py-3 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>{savingToDrive ? 'Saving to Drive...' : 'Save Archive to Drive'}</span>
          </button>
          <button
            type="button"
            disabled={compilingYearEnd}
            onClick={handleOpenYearEnd}
            className="px-5 py-3 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>
              {compilingYearEnd
                ? 'Compiling Archive Book...'
                : 'Compile & Print Full School Year Archive (1-Click)'}
            </span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-900 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
          {driveArchiveLink && (
            <a
              href={driveArchiveLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Drive</span>
            </a>
          )}
        </div>
      )}

      {canUpload && showUploadPanel && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Complete Stage 5: Upload Scanned Printed / Approved Copy
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Select a Stage 3 or Stage 4 document and attach its scanned PDF or JPG/PNG photo.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
              {error}
            </div>
          )}

          {readyForStage5.length === 0 ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No Stage 3 or Stage 4 records are awaiting scanning right now.
            </p>
          ) : (
            <form onSubmit={handleStage5Submit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Select Control Number (Stage 3 or Stage 4)
                </label>
                <select
                  value={targetDocId || readyForStage5[0]?.id || ''}
                  onChange={(e) => setTargetDocId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {readyForStage5.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.controlNumber} — {d.title} (Stage {d.currentStage})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    Signatories / Stamp Notes
                  </label>
                  <input
                    type="text"
                    required
                    value={wetInkSignatories}
                    onChange={(e) => setWetInkSignatories(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    Archival Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Dry-sealed & filed in Binder 1"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-600 rounded-lg p-5 bg-slate-50 cursor-pointer">
                <FileUp className="w-6 h-6 text-blue-700 mb-1.5" />
                <span className="text-sm font-medium text-slate-800">
                  {scanFile ? scanFile.name : 'Choose scanned PDF or photo (JPG / PNG)'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                  onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadPanel(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer"
                >
                  {submitting ? 'Archiving...' : 'Mark Stage 5 Complete & Archive'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Archived Stage 5 Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-bold text-slate-900">
              Stage 5 Archived Records ({archivedDocs.length})
            </h3>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  ['ALL', 'All'],
                  ['general', 'General Docs'],
                  ['accomplishment', 'Accomplishment Reports'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setModuleFilter(val)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    moduleFilter === val
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={compilingYearEnd}
            onClick={handleDownloadYearEnd}
            className="text-xs font-semibold text-blue-800 hover:underline inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{compilingYearEnd ? 'Compiling...' : 'Download Full Year-End PDF Book'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-3">Control Number</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Document Title &amp; Module</th>
                <th className="py-3 px-3">Signatories</th>
                <th className="py-3 px-3">Archived By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {archivedDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No Stage 5 scanned hardcopy records found.
                  </td>
                </tr>
              ) : (
                archivedDocs.map((doc, idx) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono-code text-xs text-slate-500 tabular-nums">
                      #{String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-3.5 px-3 font-mono-code text-xs font-bold text-blue-900 tabular-nums whitespace-nowrap">
                      {doc.controlNumber}
                    </td>
                    <td className="py-3.5 px-3 font-mono-code text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {doc.documentDate}
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-slate-900">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        {doc.organizationName} ·{' '}
                        {doc.docType === 'accomplishment'
                          ? 'Accomplishment Report'
                          : doc.category}
                      </p>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-700">
                      {doc.hardcopyScan?.wetInkSignatories}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">
                      <p className="font-medium text-slate-800">{doc.hardcopyScan?.uploadedByName}</p>
                      <p className="tabular-nums text-[11px] text-slate-500">
                        {doc.hardcopyScan ? formatDateTime(doc.hardcopyScan.uploadedAt) : ''}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onPreviewHardcopy(doc)}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Scan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrintEartag(doc)}
                          className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Tag className="w-3.5 h-3.5" />
                          <span>Eartag</span>
                        </button>
                        <a
                          href={getHardcopyFileUrl(doc, true)}
                          download
                          title="Download Scan"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
