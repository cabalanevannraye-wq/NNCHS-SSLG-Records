import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FilePlus2,
  FileText,
  FileUp,
  HardDrive,
  PenTool,
  Printer,
  ScanLine,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import { connectGoogleDriveWithPopup, getGoogleDriveAccessToken } from '../firebase.ts';
import { getDocumentFileUrl, getHardcopyFileUrl } from '../lib/api.ts';
import { firebaseService } from '../lib/firebaseService.ts';
import { downloadDriveFileBlob, uploadBlobToGoogleDrive } from '../lib/googleDrive.ts';
import {
  ACCOMPLISHMENT_CATEGORIES,
  CORE_VALUES,
  GENERAL_CATEGORIES,
  type DocumentModuleType,
  type SSLGDocument,
  type UserAccount,
  type WorkflowStage,
} from '../types.ts';
import { StageBadge, formatDateTime, formatFileSize } from './SSLGCrest.tsx';

interface DocumentTrackerViewProps {
  docType: DocumentModuleType;
  documents: SSLGDocument[];
  currentUser: UserAccount;
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  onOpenSubmitModal: () => void;
  onDocumentUpdated: (doc: SSLGDocument) => void;
  onDocumentDeleted: (id: string) => void;
  onOpenESign: (doc: SSLGDocument) => void;
  onOpenEartag: (doc: SSLGDocument) => void;
  onOpenTransmittalSlip: (docs: SSLGDocument[], from: string, to: string) => void;
  onPreviewFile: (doc: SSLGDocument) => void;
  onPreviewHardcopy: (doc: SSLGDocument) => void;
}

const PIPELINE_STAGES: Array<{ stage: WorkflowStage; label: string; short: string }> = [
  { stage: 1, label: 'Author Submission', short: '1. Submitted' },
  { stage: 2, label: 'Electronic Signature', short: '2. E-Sign' },
  { stage: 3, label: 'Control No. & Eartag', short: '3. Control & Eartag' },
  { stage: 4, label: 'File Printing', short: '4. Printed' },
  { stage: 5, label: 'Scanned Hardcopy', short: '5. Archived' },
];

export function DocumentTrackerView({
  docType,
  documents,
  currentUser,
  selectedDocId,
  onSelectDoc,
  onOpenSubmitModal,
  onDocumentUpdated,
  onDocumentDeleted,
  onOpenESign,
  onOpenEartag,
  onOpenTransmittalSlip,
  onPreviewFile,
  onPreviewHardcopy,
}: DocumentTrackerViewProps) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | WorkflowStage>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [coreValueFilter, setCoreValueFilter] = useState<string>('ALL');
  const [busyAction, setBusyAction] = useState(false);
  const [savingToDrive, setSavingToDrive] = useState(false);
  const [actionError, setActionError] = useState('');
  const [driveMessage, setDriveMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setCategoryFilter('ALL');
    setCoreValueFilter('ALL');
  }, [docType]);

  // Stage 5 inline hardcopy scan upload state
  const [showScanUpload, setShowScanUpload] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanSignatories, setScanSignatories] = useState('SSLG President & Officers');
  const [scanNotes, setScanNotes] = useState('');

  const moduleDocs = useMemo(
    () => documents.filter((d) => d.docType === docType),
    [documents, docType]
  );

  const categories =
    docType === 'accomplishment' ? ACCOMPLISHMENT_CATEGORIES : GENERAL_CATEGORIES;

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return moduleDocs.filter((d) => {
      if (stageFilter !== 'all' && d.currentStage !== stageFilter) return false;
      if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false;
      if (
        docType === 'accomplishment' &&
        coreValueFilter !== 'ALL' &&
        d.coreValue !== coreValueFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (d.controlNumber || '').toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.organizationName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        (d.coreValue || '').toLowerCase().includes(q)
      );
    });
  }, [moduleDocs, search, stageFilter, categoryFilter, coreValueFilter, docType]);

  const selectedDoc = useMemo(() => {
    return (
      moduleDocs.find((d) => d.id === selectedDocId) ||
      filteredDocs[0] ||
      moduleDocs[0] ||
      null
    );
  }, [moduleDocs, filteredDocs, selectedDocId]);

  const isOfficerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'officer';
  const canDeleteSelected =
    selectedDoc &&
    (currentUser.role === 'admin' ||
      selectedDoc.submittedByUserId === currentUser.id ||
      selectedDoc.organizationName.toLowerCase() === currentUser.positionOrClub.toLowerCase());

  const handleReceiveForEsign = async () => {
    if (!selectedDoc) return;
    setActionError('');
    setBusyAction(true);
    try {
      const updated = await firebaseService.receiveForEsign(selectedDoc, currentUser);
      onDocumentUpdated(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to receive document');
    } finally {
      setBusyAction(false);
    }
  };

  const handleMarkPrinted = async () => {
    if (!selectedDoc) return;
    setActionError('');
    setBusyAction(true);
    try {
      const updated = await firebaseService.markDocumentPrinted(selectedDoc, currentUser);
      onDocumentUpdated(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark as printed');
    } finally {
      setBusyAction(false);
    }
  };

  const handleUploadStage5Scan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !scanFile) {
      setActionError('Please attach the scanned PDF or photo (JPG/PNG) of the printed copy.');
      return;
    }
    setActionError('');
    setBusyAction(true);
    try {
      const updated = await firebaseService.uploadHardcopyScanForDoc(
        selectedDoc,
        currentUser,
        documents,
        {
          file: scanFile,
          wetInkSignatories: scanSignatories,
          notes: scanNotes,
        }
      );
      onDocumentUpdated(updated);
      setShowScanUpload(false);
      setScanFile(null);
      setScanNotes('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to upload scanned hardcopy');
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const target = documents.find((d) => d.id === docId);
    if (!target) return;
    setActionError('');
    setBusyAction(true);
    try {
      await firebaseService.deleteDocument(target, documents);
      setConfirmDeleteId(null);
      onDocumentDeleted(docId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setBusyAction(false);
    }
  };

  const handleSaveDocToDrive = async () => {
    if (!selectedDoc) return;
    setActionError('');
    setDriveMessage('');
    setSavingToDrive(true);
    try {
      if (!getGoogleDriveAccessToken()) {
        await connectGoogleDriveWithPopup();
      }
      const activePath = selectedDoc.signedFilePath || selectedDoc.filePath;
      let blob: Blob;
      const fileName = selectedDoc.signedFilePath
        ? `${selectedDoc.controlNumber || selectedDoc.id}_Signed.pdf`
        : selectedDoc.fileName;
      const mimeType = selectedDoc.signedFilePath ? 'application/pdf' : selectedDoc.fileMimeType;

      if (activePath.startsWith('drive:')) {
        const { blob: driveBlob } = await downloadDriveFileBlob(activePath.slice(6), mimeType);
        blob = driveBlob;
      } else if (activePath.startsWith('local:')) {
        throw new Error(
          'This file was logged without backend storage or Drive. Open the Google Drive tab to upload it directly.'
        );
      } else {
        const res = await fetch(getDocumentFileUrl(selectedDoc));
        if (!res.ok) {
          throw new Error(`Could not fetch file (${res.status}) for Google Drive backup.`);
        }
        blob = await res.blob();
      }

      const uploaded = await uploadBlobToGoogleDrive({
        blob,
        fileName,
        mimeType,
      });
      const updated = await firebaseService.attachDriveFileToDocument(selectedDoc, uploaded);
      onDocumentUpdated(updated);
      setDriveMessage('Saved backup copy to Google Drive (SSLG Records folder).');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save copy to Google Drive');
    } finally {
      setSavingToDrive(false);
    }
  };

  const moduleTitle =
    docType === 'accomplishment' ? 'Accomplishment Reports' : 'General Documents';
  const moduleSubtitle =
    docType === 'accomplishment'
      ? 'Dedicated 5-step transmittal pipeline for Accomplishment Reports (AR-2026 series).'
      : '5-step transmittal pipeline for Activity Proposals, Resolutions, Financial Reports, Memoranda & Letters.';

  return (
    <div className="space-y-5">
      {/* Module Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{moduleTitle}</h2>
          <p className="text-xs text-slate-600 mt-0.5">{moduleSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={onOpenSubmitModal}
          className="px-4 py-2.5 text-sm font-bold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>
            {docType === 'accomplishment'
              ? 'Submit Accomplishment Report'
              : 'Submit General Document'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, control no., club..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All {moduleTitle} Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {docType === 'accomplishment' && (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setCoreValueFilter('ALL')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    coreValueFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Core Values
                </button>
                {CORE_VALUES.map((cv) => (
                  <button
                    key={cv}
                    type="button"
                    onClick={() => setCoreValueFilter(cv)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                      coreValueFilter === cv
                        ? 'bg-blue-800 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cv}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setStageFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                  stageFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({moduleDocs.length})
              </button>
              {([1, 2, 3, 4, 5] as WorkflowStage[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStageFilter(st)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                    stageFilter === st
                      ? 'bg-blue-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  S{st}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-200 max-h-[650px] overflow-y-auto">
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No records match this filter.
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onSelectDoc(doc.id);
                      setShowScanUpload(false);
                      setConfirmDeleteId(null);
                      setActionError('');
                      setDriveMessage('');
                    }}
                    className={`w-full text-left p-4 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono-code text-xs font-bold text-blue-900">
                        {doc.controlNumber || 'Pending Control No.'}
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {doc.documentDate}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
                      {doc.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 truncate">
                      {doc.organizationName} · {doc.category}
                      {doc.coreValue ? ` · ${doc.coreValue}` : ''}
                    </p>
                    <div className="mt-2">
                      <StageBadge stage={doc.currentStage} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail: 5-Stage Progress Bar & Actions */}
        <div className="lg:col-span-8">
          {!selectedDoc ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              Select a record on the left or submit a new file to view its 5-step progress tracker.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Record Header */}
              <div className="p-6 border-b border-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono-code font-bold text-sm text-blue-900">
                        {selectedDoc.controlNumber || 'Control No. Issued at Stage 3'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedDoc.category}</span>
                      {selectedDoc.coreValue && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-blue-800">
                            {selectedDoc.coreValue}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">Date: {selectedDoc.documentDate}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 leading-snug">
                      {selectedDoc.title}
                    </h3>
                    <p className="text-sm text-slate-600">
                      Author / Club:{' '}
                      <strong className="text-slate-900">{selectedDoc.organizationName}</strong> (
                      {selectedDoc.authorName})
                    </p>
                  </div>
                  <StageBadge stage={selectedDoc.currentStage} />
                </div>

                <p className="mt-4 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <span className="font-semibold text-slate-900">Purpose: </span>
                  {selectedDoc.purpose}
                </p>

                {/* File & Utility Bar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPreviewFile(selectedDoc)}
                      className="px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>
                        {selectedDoc.signedFilePath ? 'Preview Signed File' : 'Preview File'}
                      </span>
                    </button>
                    <a
                      href={getDocumentFileUrl(selectedDoc, { download: true })}
                      download
                      className="px-3.5 py-2 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download ({formatFileSize(selectedDoc.fileSize)})</span>
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTransmittalSlip(
                          [selectedDoc],
                          selectedDoc.organizationName,
                          'SSLG Records Office'
                        )
                      }
                      className="px-3.5 py-2 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Transmittal Slip</span>
                    </button>
                    {selectedDoc.driveWebViewLink && (
                      <a
                        href={selectedDoc.driveWebViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Drive</span>
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={savingToDrive}
                      onClick={handleSaveDocToDrive}
                      className="px-3.5 py-2 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-blue-800" />
                      <span>
                        {savingToDrive
                          ? 'Saving to Drive...'
                          : selectedDoc.driveFileId
                          ? 'Sync Copy to Drive'
                          : 'Save to Drive'}
                      </span>
                    </button>
                  </div>

                  {/* Delete File Permission for Author / Admin */}
                  {canDeleteSelected && (
                    <div>
                      {confirmDeleteId === selectedDoc.id ? (
                        <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                          <span className="text-xs font-semibold text-rose-900">
                            Delete this file?
                          </span>
                          <button
                            type="button"
                            disabled={busyAction}
                            onClick={() => handleDeleteDocument(selectedDoc.id)}
                            className="px-2.5 py-1 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded cursor-pointer"
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(selectedDoc.id)}
                          className="px-3 py-2 text-xs font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete File</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Exact 5-Stage Progress Bar & Contextual Next-Step Actions */}
              <div className="p-6 bg-slate-50/80 border-b border-slate-200 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    5-Step Transmittal Progress Tracker
                  </h4>
                  <span className="text-xs font-semibold text-blue-900">
                    Stage {selectedDoc.currentStage} of 5 · {selectedDoc.stageLabel}
                  </span>
                </div>

                {/* Stepper */}
                <div className="grid grid-cols-5 gap-2">
                  {PIPELINE_STAGES.map((step, idx) => {
                    const isCompleted =
                      selectedDoc.currentStage === 5
                        ? true
                        : step.stage < selectedDoc.currentStage;
                    const isCurrent =
                      selectedDoc.currentStage !== 5 && step.stage === selectedDoc.currentStage;

                    return (
                      <div key={step.stage} className="flex flex-col items-center text-center">
                        <div className="w-full flex items-center">
                          <div
                            className={`h-1 flex-1 ${
                              idx === 0
                                ? 'bg-transparent'
                                : isCompleted || isCurrent
                                ? 'bg-blue-700'
                                : 'bg-slate-300'
                            }`}
                          />
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${
                              isCompleted
                                ? 'bg-emerald-700 border-emerald-700 text-white'
                                : isCurrent
                                ? 'bg-blue-800 border-blue-800 text-white'
                                : 'bg-white border-slate-300 text-slate-500'
                            }`}
                          >
                            {isCompleted ? <Check className="w-4 h-4" /> : step.stage}
                          </div>
                          <div
                            className={`h-1 flex-1 ${
                              idx === PIPELINE_STAGES.length - 1
                                ? 'bg-transparent'
                                : isCompleted
                                ? 'bg-blue-700'
                                : 'bg-slate-300'
                            }`}
                          />
                        </div>
                        <span
                          className={`mt-2 text-xs leading-tight ${
                            isCurrent || isCompleted
                              ? 'text-slate-900 font-bold'
                              : 'text-slate-500 font-medium'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {actionError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
                    {actionError}
                  </div>
                )}

                {driveMessage && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center justify-between gap-2">
                    <span>{driveMessage}</span>
                    {selectedDoc.driveWebViewLink && (
                      <a
                        href={selectedDoc.driveWebViewLink}
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

                {/* Stage-Specific Big Clear Action Panel */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  {selectedDoc.currentStage === 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Next Step: Stage 2 — Electronic Signature
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {isOfficerOrAdmin
                            ? 'Receive this submission for review or apply your E-Signature directly to issue the Control Number.'
                            : 'Waiting for an SSLG Officer or the SSLG President to review and e-sign your uploaded file.'}
                        </p>
                      </div>
                      {isOfficerOrAdmin && (
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            disabled={busyAction}
                            onClick={handleReceiveForEsign}
                            className="px-4 py-2.5 text-sm font-semibold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg cursor-pointer"
                          >
                            Receive for E-Sign (Stage 2)
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenESign(selectedDoc)}
                            className="px-4 py-2.5 text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer"
                          >
                            <PenTool className="w-4 h-4" />
                            <span>Approve &amp; E-Sign</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedDoc.currentStage === 2 && (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Stage 2 Active: Ready for Electronic Signature
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {isOfficerOrAdmin
                            ? 'Applying your E-Signature stamps the PDF, auto-generates the Control Number, and unlocks Stage 3 Eartag Printing.'
                            : 'An SSLG Officer is reviewing this document for electronic signature.'}
                        </p>
                      </div>
                      {isOfficerOrAdmin && (
                        <button
                          type="button"
                          onClick={() => onOpenESign(selectedDoc)}
                          className="px-5 py-2.5 text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer"
                        >
                          <PenTool className="w-4 h-4" />
                          <span>Approve &amp; E-Sign (Issue Control No.)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {selectedDoc.currentStage === 3 && (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Stage 3 Ready: Control No.{' '}
                          <span className="font-mono-code text-blue-900">
                            {selectedDoc.controlNumber}
                          </span>{' '}
                          &amp; Eartag Unlocked
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Print the signed document and attach the Eartag for physical routing, then mark Stage 4 as Printed.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onOpenEartag(selectedDoc)}
                          className="px-4 py-2.5 text-sm font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 rounded-lg inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Tag className="w-4 h-4 text-blue-800" />
                          <span>Print Eartag</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onPreviewFile(selectedDoc)}
                          className="px-4 py-2.5 text-sm font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 rounded-lg inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Print Signed Document</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyAction}
                          onClick={handleMarkPrinted}
                          className="px-4 py-2.5 text-sm font-bold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{busyAction ? 'Updating...' : 'Mark Stage 4: Printed'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedDoc.currentStage === 4 && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Stage 4 Completed (Printed) — Final Step: Stage 5 Hardcopy Scan
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Once physical signatures/dry seal are finalized, upload the scanned PDF or photo (JPG/PNG) to complete Stage 5.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenEartag(selectedDoc)}
                            className="px-3.5 py-2 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span>Print Eartag</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowScanUpload((v) => !v)}
                            className="px-4 py-2.5 text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer"
                          >
                            <ScanLine className="w-4 h-4" />
                            <span>
                              {showScanUpload
                                ? 'Close Scan Uploader'
                                : 'Upload Scanned Copy (Stage 5)'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {showScanUpload && (
                        <form
                          onSubmit={handleUploadStage5Scan}
                          className="p-4 bg-slate-50 border border-slate-300 rounded-lg space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Physical Signatories / Stamp Notes
                              </label>
                              <input
                                type="text"
                                required
                                value={scanSignatories}
                                onChange={(e) => setScanSignatories(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Filing Notes (Optional)
                              </label>
                              <input
                                type="text"
                                value={scanNotes}
                                onChange={(e) => setScanNotes(e.target.value)}
                                placeholder="e.g., Dry-sealed and filed in Binder 1"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                              />
                            </div>
                          </div>

                          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-lg p-4 bg-white cursor-pointer">
                            <FileUp className="w-5 h-5 text-emerald-700 mb-1" />
                            <span className="text-xs font-semibold text-slate-800">
                              {scanFile
                                ? scanFile.name
                                : 'Select scanned PDF or photo (JPG / PNG)'}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                              onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                              className="hidden"
                            />
                          </label>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowScanUpload(false)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={busyAction}
                              className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer"
                            >
                              {busyAction
                                ? 'Archiving...'
                                : 'Complete Stage 5 & Send to Signed Hardcopy Archive'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {selectedDoc.currentStage === 5 && (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-emerald-900">
                          Stage 5 Complete — 100% Completed &amp; Archived
                        </p>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          Final scanned hardcopy uploaded ({selectedDoc.hardcopyScan?.fileName}) and
                          included in the Signed Hardcopy Scans archive.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenEartag(selectedDoc)}
                          className="px-3.5 py-2 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Tag className="w-3.5 h-3.5" />
                          <span>Print Eartag</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onPreviewHardcopy(selectedDoc)}
                          className="px-4 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Scanned Hardcopy</span>
                        </button>
                        <a
                          href={getHardcopyFileUrl(selectedDoc, true)}
                          download
                          className="px-3.5 py-2 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Scan</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Electronic Signatures & Timestamped Transmittal Log */}
              <div className="p-6 space-y-6">
                {selectedDoc.signatures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-3">
                      Applied Electronic Signatures ({selectedDoc.signatures.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedDoc.signatures.map((sig) => (
                        <div
                          key={sig.id}
                          className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center gap-3"
                        >
                          <img
                            src={sig.signatureDataUrl}
                            alt={`Signature of ${sig.signerName}`}
                            className="h-12 w-24 object-contain bg-white border border-slate-200 rounded p-1 shrink-0"
                          />
                          <div className="min-w-0 text-xs">
                            <p className="font-bold text-slate-900 truncate">{sig.signerName}</p>
                            <p className="text-slate-600 truncate">{sig.signerPosition}</p>
                            <p className="text-slate-500 tabular-nums mt-0.5">
                              {formatDateTime(sig.signedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Timestamped Transmittal Tracking Log</span>
                  </h4>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    {[...selectedDoc.transmittalHistory].reverse().map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {ev.stepLabel}
                            </span>
                            <span className="text-xs text-slate-500">· {ev.action}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Handled by <strong className="text-slate-800">{ev.actorName}</strong> (
                            {ev.actorPosition}) — {ev.remarks}
                          </p>
                        </div>
                        <span className="font-mono-code text-xs text-slate-500 tabular-nums whitespace-nowrap shrink-0">
                          {formatDateTime(ev.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
