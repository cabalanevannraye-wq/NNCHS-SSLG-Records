import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  FileUp,
  HardDrive,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import {
  getGoogleDriveAccessToken,
  subscribeDriveTokenChange,
} from '../firebase.ts';
import { firebaseService } from '../lib/firebaseService.ts';
import {
  downloadDriveFileAsFile,
  DriveAuthError,
  listDriveFiles,
  uploadBlobToGoogleDrive,
  type DriveFileItem,
} from '../lib/googleDrive.ts';
import {
  ACCOMPLISHMENT_CATEGORIES,
  CORE_VALUES,
  GENERAL_CATEGORIES,
  type CoreValue,
  type DocumentCategory,
  type DocumentModuleType,
  type SSLGDocument,
  type UserAccount,
} from '../types.ts';
import { GoogleDriveConnectCard } from './GoogleDriveView.tsx';

interface PassDocumentModalProps {
  docType: DocumentModuleType;
  currentUser: UserAccount;
  documents: SSLGDocument[];
  onClose: () => void;
  onCreated: (doc: SSLGDocument) => void;
  onViewTracker: (doc: SSLGDocument) => void;
}

export function PassDocumentModal({
  docType,
  currentUser,
  documents,
  onClose,
  onCreated,
  onViewTracker,
}: PassDocumentModalProps) {
  const categories =
    docType === 'accomplishment' ? ACCOMPLISHMENT_CATEGORIES : GENERAL_CATEGORIES;

  const [sourceMode, setSourceMode] = useState<'device' | 'drive'>('device');
  const [hasDriveToken, setHasDriveToken] = useState(() => Boolean(getGoogleDriveAccessToken()));
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFileItem | null>(null);
  const [backupToDrive, setBackupToDrive] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>(categories[0]);
  const [coreValue, setCoreValue] = useState<CoreValue>('Maka-Tao');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose] = useState('');
  const [organizationOverride, setOrganizationOverride] = useState(
    currentUser.role === 'organization' ? currentUser.positionOrClub : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdDoc, setCreatedDoc] = useState<SSLGDocument | null>(null);

  useEffect(() => {
    return subscribeDriveTokenChange((tok) => setHasDriveToken(Boolean(tok)));
  }, []);

  const loadDrivePickerFiles = async () => {
    setLoadingDrive(true);
    setError('');
    try {
      const list = await listDriveFiles({ pageSize: 25 });
      setDriveFiles(list);
    } catch (err) {
      if (err instanceof DriveAuthError) setHasDriveToken(false);
      setError(err instanceof Error ? err.message : 'Unable to fetch Google Drive files.');
    } finally {
      setLoadingDrive(false);
    }
  };

  useEffect(() => {
    if (sourceMode === 'drive' && hasDriveToken) {
      void loadDrivePickerFiles();
    }
  }, [sourceMode, hasDriveToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceMode === 'device' && !file) {
      setError('Please upload your prepared file (PDF, DOCX, JPG, or PNG).');
      return;
    }
    if (sourceMode === 'drive' && !selectedDriveFile) {
      setError('Please select a file from your Google Drive.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      let submissionFile = file;
      let driveFileId: string | null = null;
      let driveWebViewLink: string | null = null;

      if (sourceMode === 'drive' && selectedDriveFile) {
        submissionFile = await downloadDriveFileAsFile(selectedDriveFile);
        driveFileId = selectedDriveFile.id;
        driveWebViewLink = selectedDriveFile.webViewLink || null;
      } else if (sourceMode === 'device' && file && backupToDrive && hasDriveToken) {
        try {
          const uploadedDrive = await uploadBlobToGoogleDrive({
            blob: file,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
          });
          driveFileId = uploadedDrive.id;
          driveWebViewLink = uploadedDrive.webViewLink || null;
        } catch {
          // Non-blocking Drive backup if token expired
        }
      }

      if (!submissionFile) {
        throw new Error('Selected file could not be read.');
      }

      const created = await firebaseService.createDocument(currentUser, documents, {
        file: submissionFile,
        docType,
        title: title.trim(),
        category,
        coreValue: docType === 'accomplishment' ? coreValue : null,
        documentDate,
        purpose: purpose.trim(),
        organizationOverride:
          currentUser.role !== 'organization' && organizationOverride.trim()
            ? organizationOverride.trim()
            : undefined,
        driveFileId,
        driveWebViewLink,
      });
      setCreatedDoc(created);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit document');
    } finally {
      setSubmitting(false);
    }
  };

  const moduleLabel =
    docType === 'accomplishment' ? 'Accomplishment Report' : 'General Document';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full shadow-xl overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Stage 1: Submit {moduleLabel}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Upload from your device or import directly from Google Drive. Control No. unlocks at Stage 3.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdDoc ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-950">
                  Stage 1 Complete — {moduleLabel} Uploaded
                </h4>
                <p className="text-xs text-emerald-800 mt-1">
                  Your file is now in the queue for <strong>Stage 2: Electronic Signature</strong>.
                  Once e-signed by an SSLG Officer or the SSLG President, a sequential Control
                  Number will be generated automatically.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-1.5">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Title:</span>
                <span className="font-semibold text-slate-900 text-right">{createdDoc.title}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Category:</span>
                <span className="text-slate-900">{createdDoc.category}</span>
              </div>
              {createdDoc.coreValue && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Core Value:</span>
                  <span className="font-semibold text-slate-900">{createdDoc.coreValue}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Current Stage:</span>
                <span className="font-semibold text-blue-800">{createdDoc.stageLabel}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewTracker(createdDoc);
                }}
                className="px-5 py-2.5 text-sm font-semibold bg-blue-800 hover:bg-blue-900 text-white rounded-lg cursor-pointer"
              >
                View 5-Step Progress Tracker
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
                {error}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-sm font-semibold text-slate-800">
                  1. Attach Prepared File
                </label>
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSourceMode('device')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer inline-flex items-center gap-1 ${
                      sourceMode === 'device'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>From Device</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceMode('drive')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer inline-flex items-center gap-1 ${
                      sourceMode === 'drive'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Google Drive</span>
                  </button>
                </div>
              </div>

              {sourceMode === 'device' ? (
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-700 rounded-lg p-5 bg-slate-50/80 cursor-pointer transition-colors">
                    <FileUp className="w-7 h-7 text-blue-800 mb-2" />
                    <span className="text-sm font-semibold text-slate-800 text-center">
                      {file ? file.name : 'Click to browse prepared file (PDF, DOCX, JPG, PNG)'}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Prepare your document externally—no templates inside the app
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {hasDriveToken && (
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={backupToDrive}
                        onChange={(e) => setBackupToDrive(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span>Also save a backup copy to Google Drive (SSLG Records folder)</span>
                    </label>
                  )}
                </div>
              ) : !hasDriveToken ? (
                <GoogleDriveConnectCard
                  compact
                  onConnected={() => setHasDriveToken(true)}
                  subtitle="Sign in with Google to choose a document directly from Google Drive."
                />
              ) : (
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                  <div className="px-3 py-2 bg-white border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Select a Google Drive file
                    </span>
                    <button
                      type="button"
                      disabled={loadingDrive}
                      onClick={() => void loadDrivePickerFiles()}
                      className="text-xs font-semibold text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingDrive ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 bg-white">
                    {loadingDrive && driveFiles.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Loading Google Drive files...
                      </div>
                    ) : driveFiles.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No files found in your Google Drive.
                      </div>
                    ) : (
                      driveFiles.map((df) => {
                        const isPicked = selectedDriveFile?.id === df.id;
                        return (
                          <button
                            key={df.id}
                            type="button"
                            onClick={() => {
                              setSelectedDriveFile(df);
                              if (!title.trim()) {
                                setTitle(df.name.replace(/\.[^.]+$/, ''));
                              }
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 cursor-pointer ${
                              isPicked ? 'bg-blue-50 text-blue-950 font-semibold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span className="inline-flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                              <span className="truncate">{df.name}</span>
                            </span>
                            {isPicked && <span className="text-[11px] text-blue-800 shrink-0">Selected</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="doc-title" className="block text-sm font-semibold text-slate-800 mb-1">
                2. Document Title
              </label>
              <input
                id="doc-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  docType === 'accomplishment'
                    ? 'e.g., Q3 Science Club Accomplishment Report'
                    : 'e.g., Campus Clean-Up Drive Activity Proposal'
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="doc-cat" className="block text-sm font-semibold text-slate-800 mb-1">
                  Category
                </label>
                <select
                  id="doc-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="doc-date" className="block text-sm font-semibold text-slate-800 mb-1">
                  Document Date
                </label>
                <input
                  id="doc-date"
                  type="date"
                  required
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
            </div>

            {docType === 'accomplishment' && (
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  DepEd Core Value Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CORE_VALUES.map((cv) => (
                    <button
                      key={cv}
                      type="button"
                      onClick={() => setCoreValue(cv)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-center ${
                        coreValue === cv
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {cv}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentUser.role !== 'organization' && (
              <div>
                <label htmlFor="doc-org" className="block text-sm font-semibold text-slate-800 mb-1">
                  Author / Club Name (Optional)
                </label>
                <input
                  id="doc-org"
                  type="text"
                  value={organizationOverride}
                  onChange={(e) => setOrganizationOverride(e.target.value)}
                  placeholder={`Default: ${currentUser.positionOrClub}`}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
            )}

            <div>
              <label htmlFor="doc-purpose" className="block text-sm font-semibold text-slate-800 mb-1">
                Purpose / Short Summary
              </label>
              <textarea
                id="doc-purpose"
                rows={2}
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Briefly state what this submission covers..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-semibold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : `Submit ${moduleLabel}`}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
