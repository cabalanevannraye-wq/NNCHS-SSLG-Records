import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Cloud,
  Download,
  Eye,
  EyeOff,
  FileText,
  FileUp,
  ImagePlus,
  KeyRound,
  Lock,
  Megaphone,
  PackageSearch,
  Plus,
  Printer,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { buildApiUrl } from '../../lib/api.ts';
import {
  downloadOriginalPrintFile,
  downloadResolutionPdf,
  downloadTextFile,
} from '../../lib/downloadEngine.ts';
import {
  DEFAULT_YORP_LOGO_PATH,
  PRINT_TIMELINE_STEPS,
  SHARED_CLOUD_URL,
  exportPortalSnapshotJson,
  loadSyncConfig,
  normalizeCloudSyncUrl,
  parsePortalSnapshotJson,
  readFileAsDataUrl,
  saveSyncConfig,
  type AboutPhotoItem,
  type BulletinPost,
  type CalendarEventItem,
  type FundAllocationItem,
  type GrievanceTicket,
  type HeroSlide,
  type ImpactStatItem,
  type LegislativeRecord,
  type LostFoundItem,
  type PortalProgram,
  type PortalSectionId,
  type PortalState,
  type PrintJobStatus,
  type PrintRequestJob,
  type PublicClub,
  type PublicOfficer,
  type SyncConnectionMode,
} from '../../lib/portalStore.ts';
import { UserAvatar } from '../SSLGCrest.tsx';
import { PortalCsvImportExportTab } from './PortalCsvImportExportTab.tsx';
import { StatusTrackerTimeline } from './ServicesPrintingSection.tsx';

export type PortalAdminTabId =
  | 'portal-printing'
  | 'portal-grievances'
  | 'portal-bulletin'
  | 'portal-programs-lf'
  | 'portal-directory'
  | 'portal-res-cal-funds'
  | 'portal-import-export';

function dataUrlToBlobUrl(dataUrl: string, fallbackMime = 'application/octet-stream'): string | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/data:([^;]+);base64/i);
    const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
    const bin = atob(parts[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

export function PortalAdminTabs({
  activeTab,
  portal,
  onUpdatePortal,
  onNotify,
  syncMode = 'local',
  syncing = false,
  lastSyncedAt = null,
  onPublishNow,
  onPullCloudNow,
  onImportSnapshot,
  onCommitAndSync,
  authToken = null,
  currentAdminUsername = 'admin',
  onCredentialsUpdated,
}: {
  activeTab: PortalAdminTabId;
  portal: PortalState;
  onUpdatePortal: (updater: (prev: PortalState) => PortalState) => void;
  onNotify: (msg: string) => void;
  syncMode?: SyncConnectionMode;
  syncing?: boolean;
  lastSyncedAt?: string | null;
  onPublishNow?: () => Promise<void>;
  onPullCloudNow?: () => Promise<void>;
  onImportSnapshot?: (state: PortalState) => Promise<void>;
  onCommitAndSync?: (nextState: PortalState, successMessage: string) => Promise<void>;
  authToken?: string | null;
  currentAdminUsername?: string;
  onCredentialsUpdated?: (newUsername: string, newToken: string) => void;
}) {
  // 1. Free Printing Preview Modal State
  const [previewJob, setPreviewJob] = useState<PrintRequestJob | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [printStatusFilter, setPrintStatusFilter] = useState<'All' | PrintJobStatus>('All');
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  // 2. Facility Photo Lightbox
  const [facilityPhotoModal, setFacilityPhotoModal] = useState<string | null>(null);

  // 3. New Bulletin Form
  const [bulTitle, setBulTitle] = useState('');
  const [bulCat, setBulCat] = useState<BulletinPost['category']>('Advisory');
  const [bulAuthor, setBulAuthor] = useState('Office of the SSLG Secretariat');
  const [bulSummary, setBulSummary] = useState('');
  const [bulBody, setBulBody] = useState('');
  const [bulFbUrl, setBulFbUrl] = useState('https://www.facebook.com/nnchssslg.official');
  const [bulPhoto, setBulPhoto] = useState('');
  const [bulFeatured, setBulFeatured] = useState(false);

  // 3b. New Slide Form
  const [slideTitle, setSlideTitle] = useState('');
  const [slideCaption, setSlideCaption] = useState('');
  const [slideCtaLabel, setSlideCtaLabel] = useState('Explore');
  const [slideCtaSection, setSlideCtaSection] = useState<PortalSectionId>('printing');
  const [slideImg, setSlideImg] = useState('');

  // 4. New Program Form
  const [progTitle, setProgTitle] = useState('');
  const [progCategory, setProgCategory] = useState('Education');
  const [progStatus, setProgStatus] = useState<PortalProgram['status']>('Upcoming');
  const [progDate, setProgDate] = useState(new Date().toISOString().slice(0, 10));
  const [progVenue, setProgVenue] = useState('NNCHS Campus');
  const [progSummary, setProgSummary] = useState('');
  const [progPhotos, setProgPhotos] = useState<string[]>([]);

  // 4b. New Lost & Found Form
  const [lfType, setLfType] = useState<'Found' | 'Lost'>('Found');
  const [lfItemName, setLfItemName] = useState('');
  const [lfOwner, setLfOwner] = useState('');
  const [lfLastSeen, setLfLastSeen] = useState('');
  const [lfDetails, setLfDetails] = useState('');
  const [lfContact, setLfContact] = useState('SSLG Office Room 104');
  const [lfPhoto, setLfPhoto] = useState('');

  // 5. New Officer / Club Form
  const [offName, setOffName] = useState('');
  const [offPos, setOffPos] = useState('');
  const [offGrade, setOffGrade] = useState('Grade 11');
  const [offSec, setOffSec] = useState('');
  const [offBio, setOffBio] = useState('');
  const [offFb, setOffFb] = useState('https://www.facebook.com/nnchssslg.official');
  const [offPhoto, setOffPhoto] = useState('');

  const [clubName, setClubName] = useState('');
  const [clubAcronym, setClubAcronym] = useState('');
  const [clubCluster, setClubCluster] = useState('Academic & Debate');
  const [clubPres, setClubPres] = useState('');
  const [clubAdv, setClubAdv] = useState('');
  const [clubMembers, setClubMembers] = useState(30);
  const [clubDesc, setClubDesc] = useState('');

  // 6. New Resolution / Calendar / Fund Form
  const [resCode, setResCode] = useState('Resolution No. 2026-07');
  const [resTitle, setResTitle] = useState('');
  const [resDate, setResDate] = useState(new Date().toISOString().slice(0, 10));
  const [resSponsor, setResSponsor] = useState('');
  const [resSummary, setResSummary] = useState('');
  const [resFullText, setResFullText] = useState('');
  const [resPdfDataUrl, setResPdfDataUrl] = useState('');
  const [resPdfName, setResPdfName] = useState('');

  const [calTitle, setCalTitle] = useState('');
  const [calDate, setCalDate] = useState(new Date().toISOString().slice(0, 10));
  const [calTime, setCalTime] = useState('8:00 AM – 12:00 PM');
  const [calCat, setCalCat] = useState<CalendarEventItem['category']>('School-Wide Events');
  const [calVenue, setCalVenue] = useState('NNCHS Gymnasium');
  const [calDesc, setCalDesc] = useState('');

  const [fundCat, setFundCat] = useState('');
  const [fundAlloc, setFundAlloc] = useState(5000);
  const [fundSpent, setFundSpent] = useState(0);
  const [fundNotes, setFundNotes] = useState('');

  // About Section Scrollable Photos Gallery State
  const [aboutPhotoCaption, setAboutPhotoCaption] = useState('');
  const [aboutPhotoUrl, setAboutPhotoUrl] = useState('');

  // Cloud Sync & Snapshot Backup State
  const [syncApiUrlInput, setSyncApiUrlInput] = useState(() => loadSyncConfig().syncApiUrl);
  const snapshotImportRef = useRef<HTMLInputElement | null>(null);

  // Admin Credential Manager State
  const [credUsername, setCredUsername] = useState(currentAdminUsername || 'admin');
  const [credCurrentPassword, setCredCurrentPassword] = useState('');
  const [credNewPassword, setCredNewPassword] = useState('');
  const [credConfirmPassword, setCredConfirmPassword] = useState('');
  const [credSaving, setCredSaving] = useState(false);
  const [credError, setCredError] = useState('');

  useEffect(() => {
    if (currentAdminUsername) {
      setCredUsername(currentAdminUsername);
    }
  }, [currentAdminUsername]);

  useEffect(() => {
    if (!previewJob?.fileDataUrl) {
      setPreviewBlobUrl(null);
      return;
    }
    const url = dataUrlToBlobUrl(previewJob.fileDataUrl, previewJob.fileMimeType);
    setPreviewBlobUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [previewJob]);

  const handlePrintPreviewedFile = () => {
    try {
      if (printFrameRef.current?.contentWindow) {
        printFrameRef.current.contentWindow.focus();
        printFrameRef.current.contentWindow.print();
        return;
      }
    } catch {
      // fallback to document print
    }
    window.print();
  };

  // =========================================================
  // TAB 7: IMPORT / EXPORT (CSV BULK DATA & COLUMN MAPPER)
  // =========================================================
  if (activeTab === 'portal-import-export') {
    const commitHandler =
      onCommitAndSync ||
      (async (nextState: PortalState, msg: string) => {
        onUpdatePortal(() => nextState);
        onNotify(msg);
      });

    return (
      <PortalCsvImportExportTab
        portal={portal}
        syncing={syncing}
        onCommitAndSync={commitHandler}
        onNotify={onNotify}
      />
    );
  }

  // =========================================================
  // TAB 1: PRINTABLES & READY-TO-PRINT QUEUE
  // =========================================================
  if (activeTab === 'portal-printing') {
    const filteredJobs =
      printStatusFilter === 'All'
        ? portal.printJobs
        : portal.printJobs.filter((j) => j.status === printStatusFilter);

    const advanceJobStep = (job: PrintRequestJob) => {
      const idx = PRINT_TIMELINE_STEPS.findIndex((s) => s === job.status);
      if (idx >= PRINT_TIMELINE_STEPS.length - 1) return;
      const nextStatus = PRINT_TIMELINE_STEPS[idx + 1];
      onUpdatePortal((prev) => ({
        ...prev,
        printJobs: prev.printJobs.map((j) =>
          j.id === job.id ? { ...j, status: nextStatus } : j
        ),
      }));
      onNotify(`${job.jobCode} advanced to "${nextStatus}".`);
    };

    const setJobStatus = (jobId: string, status: PrintJobStatus) => {
      onUpdatePortal((prev) => ({
        ...prev,
        printJobs: prev.printJobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
      }));
      onNotify(`Print status updated to "${status}".`);
    };

    const updateJobNotes = (jobId: string, adminNotes: string) => {
      onUpdatePortal((prev) => ({
        ...prev,
        printJobs: prev.printJobs.map((j) => (j.id === jobId ? { ...j, adminNotes } : j)),
      }));
    };

    const deleteJob = (jobId: string) => {
      onUpdatePortal((prev) => ({
        ...prev,
        printJobs: prev.printJobs.filter((j) => j.id !== jobId),
      }));
      onNotify('Print job removed from queue.');
    };

    return (
      <div className="space-y-6">
        <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
              <span>Project &lsquo;Free Printing&rsquo; — Ready-to-Print Queue</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Inspect exact uploaded files (PDF, DOCX, images), print immediately, download original files, and advance the Status Tracker Request Progress.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onPublishNow && (
              <button
                type="button"
                disabled={syncing}
                onClick={() => void onPublishNow()}
                className="px-3 py-1.5 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{syncing ? 'Publishing...' : 'Publish Queue to All Visitors'}</span>
              </button>
            )}
            <div className="flex flex-wrap gap-1.5">
              {(['All', ...PRINT_TIMELINE_STEPS] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPrintStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    printStatusFilter === st
                      ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                      : 'bg-blue-50/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-blue-200 dark:border-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const stepIdx = PRINT_TIMELINE_STEPS.findIndex((s) => s === job.status);
            const hasNext = stepIdx >= 0 && stepIdx < PRINT_TIMELINE_STEPS.length - 1;
            const nextLabel = hasNext ? PRINT_TIMELINE_STEPS[stepIdx + 1] : null;

            return (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-5 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono-code font-extrabold text-blue-800 dark:text-[#fde047]">
                        {job.jobCode}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-bold text-blue-950 dark:text-white">
                        {job.studentName}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        ({job.gradeSection})
                      </span>
                    </div>
                    <p className="text-sm font-extrabold text-blue-950 dark:text-white">
                      {job.fileName}{' '}
                      <span className="text-xs font-semibold text-blue-700 dark:text-yellow-300">
                        · {job.copies} {job.copies === 1 ? 'copy' : 'copies'} · {job.colorOption}
                      </span>
                    </p>
                    {job.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Learner note: {job.notes}
                      </p>
                    )}
                    {job.fileLink && (
                      <p className="text-xs">
                        External link:{' '}
                        <a
                          href={job.fileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 dark:text-yellow-300 underline font-semibold break-all"
                        >
                          {job.fileLink}
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewJob(job)}
                      className="px-3.5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#fde047]" />
                      <span>Preview &amp; Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadOriginalPrintFile(job, onNotify)}
                      className="px-3.5 py-2 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Original</span>
                    </button>
                    {nextLabel && (
                      <button
                        type="button"
                        onClick={() => advanceJobStep(job)}
                        className="px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-900 dark:text-[#fde047] border border-blue-200 dark:border-slate-600 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Advance → {nextLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteJob(job.id)}
                      aria-label={`Delete ${job.jobCode}`}
                      className="p-2 rounded-lg border border-blue-200 dark:border-slate-700 text-slate-500 hover:text-blue-900 dark:hover:text-[#fde047] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Request Progress Status Tracker */}
                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-slate-950/60 border border-blue-100 dark:border-slate-800">
                  <StatusTrackerTimeline currentStatus={job.status} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Set Request Progress Step
                    </label>
                    <select
                      value={job.status}
                      onChange={(e) => setJobStatus(job.id, e.target.value as PrintJobStatus)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    >
                      {PRINT_TIMELINE_STEPS.map((step) => (
                        <option key={step} value={step}>
                          {step}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-8">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      SSLG Office Counter Note (shown to learner on tracker)
                    </label>
                    <input
                      type="text"
                      value={job.adminNotes}
                      onChange={(e) => updateJobNotes(job.id, e.target.value)}
                      placeholder="e.g., Printed and placed at Room 104 tray..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {filteredJobs.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No Free Printing requests under this filter.
            </div>
          )}
        </div>

        {/* Ready-to-Print File Preview Modal */}
        {previewJob && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setPreviewJob(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 bg-[#1e3a8a] text-white flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#fde047]">
                    {previewJob.jobCode} · {previewJob.copies}{' '}
                    {previewJob.copies === 1 ? 'copy' : 'copies'} · {previewJob.colorOption}
                  </p>
                  <h3 className="text-sm sm:text-base font-extrabold">{previewJob.fileName}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {previewBlobUrl && (
                    <button
                      type="button"
                      onClick={handlePrintPreviewedFile}
                      className="px-3.5 py-2 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Now</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadOriginalPrintFile(previewJob, onNotify)}
                    className="px-3.5 py-2 rounded-lg bg-white text-blue-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Original</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewJob(null)}
                    aria-label="Close print preview"
                    className="p-1.5 text-blue-100 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950">
                {previewBlobUrl &&
                (previewJob.fileMimeType === 'application/pdf' ||
                  previewJob.fileName.toLowerCase().endsWith('.pdf')) ? (
                  <iframe
                    ref={printFrameRef}
                    src={previewBlobUrl}
                    title={previewJob.fileName}
                    className="w-full h-[66vh] rounded-xl border border-blue-200 bg-white"
                  />
                ) : previewBlobUrl && previewJob.fileMimeType.startsWith('image/') ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={previewBlobUrl}
                      alt={previewJob.fileName}
                      className="max-h-[62vh] rounded-xl border border-blue-200 bg-white object-contain"
                    />
                    <iframe
                      ref={printFrameRef}
                      src={previewBlobUrl}
                      title={previewJob.fileName}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 space-y-3 text-xs">
                    <p className="text-sm font-extrabold text-blue-950 dark:text-white">
                      Document File Ready for Office Download
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Original format: <strong>{previewJob.fileMimeType}</strong> (
                      {Math.max(1, Math.round(previewJob.fileSize / 1024))} KB). Click{' '}
                      <strong>Download Original</strong> above to open directly in Word/PowerPoint/viewer
                      with exact formatting preserved.
                    </p>
                    {previewJob.fileLink && (
                      <p>
                        Submitted Link:{' '}
                        <a
                          href={previewJob.fileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 dark:text-[#fde047] underline font-bold"
                        >
                          {previewJob.fileLink}
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // TAB 2: GRIEVANCE & WELFARE MODERATION
  // =========================================================
  if (activeTab === 'portal-grievances') {
    const togglePublicApproval = (t: GrievanceTicket) => {
      const nextApproved = !t.approvedForPublic;
      onUpdatePortal((prev) => ({
        ...prev,
        tickets: prev.tickets.map((item) =>
          item.id === t.id
            ? {
                ...item,
                approvedForPublic: nextApproved,
                status: nextApproved && item.status === 'Pending Approval' ? 'Under Review' : item.status,
                updatedAt: new Date().toISOString(),
              }
            : item
        ),
      }));
      onNotify(
        nextApproved
          ? `${t.ticketCode} approved for Public Approved Concerns Feed.`
          : `${t.ticketCode} kept private in Moderation Queue.`
      );
    };

    const updateTicket = (
      ticketId: string,
      patch: Partial<Pick<GrievanceTicket, 'status' | 'adminResponse'>>
    ) => {
      onUpdatePortal((prev) => ({
        ...prev,
        tickets: prev.tickets.map((t) =>
          t.id === ticketId ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
        ),
      }));
    };

    const deleteTicket = (ticketId: string) => {
      onUpdatePortal((prev) => ({
        ...prev,
        tickets: prev.tickets.filter((t) => t.id !== ticketId),
      }));
      onNotify('Report entry removed.');
    };

    return (
      <div className="space-y-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6">
          <h2 className="text-lg font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
            <span>Grievance, Anti-Bullying &amp; Campus Facilities Moderation</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            Review incoming reports privately. Only concerns toggled as <strong>Approved for Public Page</strong> appear publicly under the Reporting System.
          </p>
        </div>

        <div className="space-y-4">
          {portal.tickets.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-5 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="font-mono-code text-blue-800 dark:text-[#fde047]">
                      {t.ticketCode}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-blue-700 dark:text-yellow-300">{t.category}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {t.isAnonymous ? 'Anonymous' : `${t.studentName} (${t.gradeSection})`}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-blue-950 dark:text-white mt-1">
                    {t.subject}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePublicApproval(t)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                      t.approvedForPublic
                        ? 'bg-[#facc15] hover:bg-[#eab308] text-slate-950'
                        : 'bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white'
                    }`}
                  >
                    {t.approvedForPublic ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approved for Public Page</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-[#fde047]" />
                        <span>Private · Click to Approve</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTicket(t.id)}
                    aria-label={`Delete ${t.ticketCode}`}
                    className="p-2 rounded-lg border border-blue-200 dark:border-slate-700 text-slate-500 hover:text-blue-900 dark:hover:text-[#fde047] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {t.immediateSafetyCheck === 'Yes, immediate intervention is needed' && (
                <div className="p-3 rounded-xl bg-[#facc15] text-slate-950 border border-[#1e3a8a] text-xs font-extrabold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>
                    URGENT SAFETY INTERVENTION REQUESTED — Coordinate immediately with Guidance Office &amp; Grade Level Learner Formation Officer.
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {t.details}
              </p>

              {(t.reportingRole ||
                t.bullyingTypes?.length ||
                t.narrativeDescription ||
                t.immediateSafetyCheck ||
                t.welfareWhatHappened ||
                t.welfareWhoDidIt ||
                t.welfareNextAction) && (
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2 text-xs">
                  <p className="font-extrabold text-blue-950 dark:text-[#fde047]">
                    Confidential Learner Welfare / Anti-Bullying Intake Record
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700 dark:text-slate-200">
                    {t.reportingRole && (
                      <p>
                        <strong>Reporting Role:</strong> {t.reportingRole}
                      </p>
                    )}
                    {t.anonymityPreference && (
                      <p>
                        <strong>Confidentiality:</strong> {t.anonymityPreference}
                      </p>
                    )}
                    {t.preferredContactMethod && !t.isAnonymous && (
                      <p>
                        <strong>Contact Preference:</strong> {t.preferredContactMethod}
                        {t.contactValue ? ` (${t.contactValue})` : ''}
                      </p>
                    )}
                    {t.bullyingTypes && t.bullyingTypes.length > 0 && (
                      <p>
                        <strong>Classification:</strong> {t.bullyingTypes.join(', ')}
                      </p>
                    )}
                    {t.incidentFrequency && (
                      <p>
                        <strong>Frequency:</strong> {t.incidentFrequency}
                      </p>
                    )}
                    {(t.incidentDateTime || t.incidentLocation) && (
                      <p>
                        <strong>When &amp; Where:</strong> {t.incidentDateTime || 'N/A'} ·{' '}
                        {t.incidentLocation || 'N/A'}
                      </p>
                    )}
                    {t.personsInvolved && (
                      <p>
                        <strong>Persons Involved:</strong> {t.personsInvolved}
                      </p>
                    )}
                    {t.witnesses && (
                      <p>
                        <strong>Witnesses:</strong> {t.witnesses}
                      </p>
                    )}
                    {t.immediateSafetyCheck && (
                      <p>
                        <strong>Safety Check:</strong> {t.immediateSafetyCheck}
                      </p>
                    )}
                    {typeof t.previouslyReported === 'boolean' && (
                      <p>
                        <strong>Previously Reported:</strong>{' '}
                        {t.previouslyReported
                          ? `Yes${t.previousReportDetails ? ` (${t.previousReportDetails})` : ''}`
                          : 'No'}
                      </p>
                    )}
                  </div>

                  {t.narrativeDescription && (
                    <p className="text-slate-700 dark:text-slate-200 whitespace-pre-line">
                      <strong>Narrative:</strong> {t.narrativeDescription}
                    </p>
                  )}

                  {t.supportPreferences && t.supportPreferences.length > 0 && (
                    <p className="text-slate-700 dark:text-slate-200">
                      <strong>Requested Support:</strong> {t.supportPreferences.join(' · ')}
                    </p>
                  )}

                  {t.evidenceLink && (
                    <p className="text-slate-700 dark:text-slate-200">
                      <strong>Evidence Link:</strong>{' '}
                      <a
                        href={t.evidenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 dark:text-[#fde047] underline font-bold break-all"
                      >
                        {t.evidenceLink}
                      </a>
                    </p>
                  )}

                  {t.evidenceFiles && t.evidenceFiles.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-2">
                      {t.evidenceFiles.map((file, idx) => (
                        <a
                          key={`${file.name}-${idx}`}
                          href={file.dataUrl}
                          download={file.name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 font-bold text-blue-900 dark:text-[#fde047] hover:underline"
                        >
                          <Download className="w-3 h-3" />
                          <span>{file.name}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {t.welfareWhatHappened && (
                    <p className="text-slate-700 dark:text-slate-200">
                      <strong>What happened:</strong> {t.welfareWhatHappened}
                    </p>
                  )}
                  {t.welfareWhoDidIt && (
                    <p className="text-slate-700 dark:text-slate-200">
                      <strong>Who did it:</strong> {t.welfareWhoDidIt}
                    </p>
                  )}
                  {t.welfareNextAction && (
                    <p className="text-slate-700 dark:text-slate-200">
                      <strong>Help needed:</strong> {t.welfareNextAction}
                    </p>
                  )}
                </div>
              )}

              {t.facilityPhotos.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Attached Facility Evidence Photos ({t.facilityPhotos.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {t.facilityPhotos.map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFacilityPhotoModal(src)}
                        className="rounded-lg overflow-hidden border border-blue-200 dark:border-slate-700 cursor-pointer"
                      >
                        <img
                          src={src}
                          alt={`Facility evidence ${idx + 1}`}
                          className="w-24 h-20 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Resolution Status
                  </label>
                  <select
                    value={t.status}
                    onChange={(e) =>
                      updateTicket(t.id, {
                        status: e.target.value as GrievanceTicket['status'],
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div className="md:col-span-8">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Official SSLG / Grade Level Formation Response
                  </label>
                  <input
                    type="text"
                    value={t.adminResponse}
                    onChange={(e) => updateTicket(t.id, { adminResponse: e.target.value })}
                    placeholder="Type response visible on tracker & approved feed..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {facilityPhotoModal && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
            onClick={() => setFacilityPhotoModal(null)}
          >
            <img
              src={facilityPhotoModal}
              alt="Facility Report Attachment"
              className="max-w-3xl max-h-[85vh] rounded-2xl border-2 border-[#facc15] object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // TAB 3: SLIDESHOW, ADVISORY, STATS & BULLETIN MANAGER
  // =========================================================
  if (activeTab === 'portal-bulletin') {
    const moveSlide = (idx: number, dir: -1 | 1) => {
      const target = idx + dir;
      if (target < 0 || target >= portal.heroSlides.length) return;
      onUpdatePortal((prev) => {
        const next = [...prev.heroSlides];
        const [item] = next.splice(idx, 1);
        next.splice(target, 0, item);
        return { ...prev, heroSlides: next };
      });
    };

    const handleAddSlide = (e: React.FormEvent) => {
      e.preventDefault();
      if (!slideTitle.trim()) return;
      const newSlide: HeroSlide = {
        id: `slide-${Date.now()}`,
        title: slideTitle.trim(),
        caption: slideCaption.trim() || 'Official NNCHS SSLG campus announcement.',
        ctaLabel: slideCtaLabel.trim() || 'Explore',
        ctaSection: slideCtaSection,
        imageUrl: slideImg || portal.heroSlides[0]?.imageUrl || '',
      };
      onUpdatePortal((prev) => ({
        ...prev,
        heroSlides: [...prev.heroSlides, newSlide],
      }));
      setSlideTitle('');
      setSlideCaption('');
      setSlideImg('');
      onNotify('Hero slideshow slide added.');
    };

    const handleAddBulletin = (e: React.FormEvent) => {
      e.preventDefault();
      if (!bulTitle.trim() || !bulSummary.trim()) return;
      const post: BulletinPost = {
        id: `bul-${Date.now()}`,
        title: bulTitle.trim(),
        category: bulCat,
        publishedAt: new Date().toISOString().slice(0, 10),
        author: bulAuthor.trim() || 'NNCHS SSLG',
        summary: bulSummary.trim(),
        fullBody: bulBody.trim() || bulSummary.trim(),
        photoUrl: bulPhoto || undefined,
        facebookPostUrl: bulFbUrl.trim() || undefined,
        featured: bulFeatured,
      };
      onUpdatePortal((prev) => ({
        ...prev,
        bulletinPosts: [post, ...prev.bulletinPosts],
      }));
      setBulTitle('');
      setBulSummary('');
      setBulBody('');
      setBulPhoto('');
      setBulFeatured(false);
      onNotify('Bulletin post published.');
    };

    return (
      <div className="space-y-8">
        {/* Advisory, School Year, Messenger Link & YORP Logo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
              <span>Campus Advisory, School Year &amp; Messenger CTA</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  School Year Label
                </label>
                <input
                  type="text"
                  value={portal.schoolYear}
                  onChange={(e) =>
                    onUpdatePortal((prev) => ({ ...prev, schoolYear: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  SSLG Updates Messenger Group Link
                </label>
                <input
                  type="url"
                  value={portal.messengerGroupUrl}
                  onChange={(e) =>
                    onUpdatePortal((prev) => ({ ...prev, messengerGroupUrl: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Campus Advisory Banner Text
              </label>
              <textarea
                rows={2}
                value={portal.campusAdvisory}
                onChange={(e) =>
                  onUpdatePortal((prev) => ({ ...prev, campusAdvisory: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Running Ticker Announcements (one line per ticker item)
              </label>
              <textarea
                rows={3}
                value={portal.tickerMessages.join('\n')}
                onChange={(e) =>
                  onUpdatePortal((prev) => ({
                    ...prev,
                    tickerMessages: e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* YORP Logo + Impact Stat Cards */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700 dark:text-[#fde047]" />
              <span>YORP Logo &amp; Impact Numbers</span>
            </h3>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/70 dark:bg-slate-800/70 border border-blue-100 dark:border-slate-700">
              <img
                src={portal.yorpLogoUrl || DEFAULT_YORP_LOGO_PATH}
                alt="NYC YORP Logo"
                className="w-12 h-12 rounded-lg bg-white object-contain p-1 border border-blue-200 shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e3a8a] text-white text-[11px] font-bold cursor-pointer">
                  <ImagePlus className="w-3.5 h-3.5 text-[#fde047]" />
                  <span>Upload YORP Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const dataUrl = await readFileAsDataUrl(file);
                      onUpdatePortal((prev) => ({ ...prev, yorpLogoUrl: dataUrl }));
                      onNotify('YORP logo updated.');
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePortal((prev) => ({ ...prev, yorpLogoUrl: DEFAULT_YORP_LOGO_PATH }))
                  }
                  className="ml-2 text-[11px] font-bold text-blue-700 dark:text-yellow-300 hover:underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {portal.impactStats.map((stat: ImpactStatItem) => (
                <div key={stat.id} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={stat.label}
                    onChange={(e) =>
                      onUpdatePortal((prev) => ({
                        ...prev,
                        impactStats: prev.impactStats.map((s) =>
                          s.id === stat.id ? { ...s, label: e.target.value } : s
                        ),
                      }))
                    }
                    className="col-span-7 px-2.5 py-1.5 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                  <input
                    type="number"
                    value={stat.value}
                    onChange={(e) =>
                      onUpdatePortal((prev) => ({
                        ...prev,
                        impactStats: prev.impactStats.map((s) =>
                          s.id === stat.id ? { ...s, value: Number(e.target.value) || 0 } : s
                        ),
                      }))
                    }
                    className="col-span-3 px-2.5 py-1.5 text-xs font-mono-code font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePortal((prev) => ({
                        ...prev,
                        impactStats: prev.impactStats.filter((s) => s.id !== stat.id),
                      }))
                    }
                    className="col-span-2 p-1.5 text-slate-400 hover:text-blue-800 dark:hover:text-[#fde047] flex justify-center cursor-pointer"
                    aria-label="Remove stat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  onUpdatePortal((prev) => ({
                    ...prev,
                    impactStats: [
                      ...prev.impactStats,
                      { id: `stat-${Date.now()}`, label: 'New Impact Metric', value: 10 },
                    ],
                  }))
                }
                className="w-full py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 text-blue-900 dark:text-[#fde047] text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Impact Card</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hero Slideshow Manager */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-5">
          <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
            Hero Slideshow Gallery ({portal.heroSlides.length} Slides)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {portal.heroSlides.map((slide, idx) => (
              <div
                key={slide.id}
                className="rounded-xl border border-blue-100 dark:border-slate-700 overflow-hidden bg-blue-50/30 dark:bg-slate-800/50 flex flex-col justify-between"
              >
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="w-full h-32 object-cover bg-[#0f172a]"
                />
                <div className="p-3.5 space-y-2 text-xs">
                  <input
                    type="text"
                    value={slide.title}
                    onChange={(e) =>
                      onUpdatePortal((prev) => ({
                        ...prev,
                        heroSlides: prev.heroSlides.map((s) =>
                          s.id === slide.id ? { ...s, title: e.target.value } : s
                        ),
                      }))
                    }
                    className="w-full px-2.5 py-1.5 font-bold rounded border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-blue-950 dark:text-white"
                  />
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveSlide(idx, -1)}
                        className="p-1.5 rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 cursor-pointer"
                        aria-label="Move slide up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlide(idx, 1)}
                        className="p-1.5 rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 cursor-pointer"
                        aria-label="Move slide down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePortal((prev) => ({
                          ...prev,
                          heroSlides: prev.heroSlides.filter((s) => s.id !== slide.id),
                        }))
                      }
                      className="text-[11px] font-bold text-blue-800 dark:text-[#fde047] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddSlide}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800"
          >
            <input
              type="text"
              required
              value={slideTitle}
              onChange={(e) => setSlideTitle(e.target.value)}
              placeholder="New slide headline..."
              className="md:col-span-4 px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <input
              type="text"
              value={slideCaption}
              onChange={(e) => setSlideCaption(e.target.value)}
              placeholder="Short caption..."
              className="md:col-span-3 px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <select
              value={slideCtaSection}
              onChange={(e) => setSlideCtaSection(e.target.value as PortalSectionId)}
              className="md:col-span-2 px-2.5 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              <option value="printing">Free Printing</option>
              <option value="reporting">Reporting System</option>
              <option value="directories">Directory</option>
              <option value="programs-calendar">Programs &amp; Calendar</option>
              <option value="resolutions-funds">Resolutions &amp; Funds</option>
            </select>
            <label className="md:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-bold cursor-pointer">
              <ImagePlus className="w-3.5 h-3.5" />
              <span>{slideImg ? 'Image Ready' : 'Upload Photo'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setSlideImg(await readFileAsDataUrl(f));
                }}
              />
            </label>
            <button
              type="submit"
              className="md:col-span-1 py-2 px-3 rounded-lg bg-[#1e3a8a] text-white text-xs font-extrabold cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>

        {/* Official Bulletin Board Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleAddBulletin}
            className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-3"
          >
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
              Publish Official Bulletin Post
            </h3>
            <input
              type="text"
              required
              value={bulTitle}
              onChange={(e) => setBulTitle(e.target.value)}
              placeholder="Headline *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={bulCat}
                onChange={(e) => setBulCat(e.target.value as BulletinPost['category'])}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              >
                <option value="Advisory">Advisory</option>
                <option value="Event Update">Event Update</option>
                <option value="Campus Notice">Campus Notice</option>
                <option value="Learner Welfare">Learner Welfare</option>
              </select>
              <input
                type="text"
                value={bulAuthor}
                onChange={(e) => setBulAuthor(e.target.value)}
                placeholder="Author / Office"
                className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <input
              type="url"
              value={bulFbUrl}
              onChange={(e) => setBulFbUrl(e.target.value)}
              placeholder="Facebook Post Link (optional)"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <textarea
              rows={2}
              required
              value={bulSummary}
              onChange={(e) => setBulSummary(e.target.value)}
              placeholder="Card summary *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <textarea
              rows={3}
              value={bulBody}
              onChange={(e) => setBulBody(e.target.value)}
              placeholder="Full announcement article..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-xs font-bold cursor-pointer border border-blue-200 dark:border-slate-700">
                <ImagePlus className="w-3.5 h-3.5" />
                <span>{bulPhoto ? 'Photo Added' : 'Attach Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setBulPhoto(await readFileAsDataUrl(f));
                  }}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulFeatured}
                  onChange={(e) => setBulFeatured(e.target.checked)}
                />
                <span>Featured</span>
              </label>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-extrabold cursor-pointer"
            >
              Publish to Bulletin Board
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-3">
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
              Published Bulletin Posts ({portal.bulletinPosts.length})
            </h3>
            <div className="space-y-2.5">
              {portal.bulletinPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-blue-950 dark:text-white truncate">
                      {post.title}
                    </p>
                    <p className="text-slate-500 dark:text-slate-300">
                      {post.category} · {post.publishedAt}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePortal((prev) => ({
                        ...prev,
                        bulletinPosts: prev.bulletinPosts.filter((p) => p.id !== post.id),
                      }))
                    }
                    className="p-1.5 text-slate-400 hover:text-blue-900 dark:hover:text-[#fde047] cursor-pointer"
                    aria-label="Delete bulletin post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* About the NNCHS-SSLG Scrollable Photos Strip Manager */}
        <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 space-y-5">
          <div>
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-blue-700 dark:text-[#fde047]" />
              <span>About the NNCHS-SSLG — Scrollable Photos Strip ({portal.aboutPhotos.length})</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Manage photos shown inside the horizontal scrollable gallery under About the NNCHS-SSLG.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {portal.aboutPhotos.map((item: AboutPhotoItem) => (
              <div
                key={item.id}
                className="rounded-xl border border-blue-100 dark:border-slate-700 bg-blue-50/40 dark:bg-slate-800/50 overflow-hidden flex flex-col justify-between"
              >
                <img
                  src={item.url}
                  alt={item.caption}
                  className="w-full h-32 object-cover bg-[#0f172a]"
                />
                <div className="p-3 space-y-2 text-xs">
                  <input
                    type="text"
                    value={item.caption}
                    onChange={(e) =>
                      onUpdatePortal((prev) => ({
                        ...prev,
                        aboutPhotos: prev.aboutPhotos.map((p) =>
                          p.id === item.id ? { ...p, caption: e.target.value } : p
                        ),
                      }))
                    }
                    placeholder="Photo caption..."
                    className="w-full px-2.5 py-1.5 rounded border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-blue-950 dark:text-white font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onUpdatePortal((prev) => ({
                        ...prev,
                        aboutPhotos: prev.aboutPhotos.filter((p) => p.id !== item.id),
                      }));
                      onNotify('About gallery photo removed.');
                    }}
                    className="text-[11px] font-bold text-blue-800 dark:text-[#fde047] hover:underline cursor-pointer"
                  >
                    Remove Photo
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!aboutPhotoUrl) return;
              const newItem: AboutPhotoItem = {
                id: `about-photo-${Date.now()}`,
                url: aboutPhotoUrl,
                caption: aboutPhotoCaption.trim() || 'NNCHS SSLG Campus Highlight',
              };
              onUpdatePortal((prev) => ({
                ...prev,
                aboutPhotos: [...prev.aboutPhotos, newItem],
              }));
              setAboutPhotoUrl('');
              setAboutPhotoCaption('');
              onNotify('Photo added to About the NNCHS-SSLG scrollable strip.');
            }}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800"
          >
            <input
              type="text"
              value={aboutPhotoCaption}
              onChange={(e) => setAboutPhotoCaption(e.target.value)}
              placeholder="Photo caption (e.g., Leadership Congress 2026)..."
              className="md:col-span-7 px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <label className="md:col-span-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-bold cursor-pointer">
              <ImagePlus className="w-3.5 h-3.5" />
              <span>{aboutPhotoUrl ? 'Photo Ready' : 'Upload Photo *'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setAboutPhotoUrl(await readFileAsDataUrl(f));
                }}
              />
            </label>
            <button
              type="submit"
              disabled={!aboutPhotoUrl}
              className="md:col-span-2 py-2 px-3 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] disabled:opacity-50 text-white text-xs font-extrabold cursor-pointer"
            >
              Add to Strip
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================
  // TAB 4: PROGRAMS & LOST/FOUND MANAGER
  // =========================================================
  if (activeTab === 'portal-programs-lf') {
    const handleAddProgram = (e: React.FormEvent) => {
      e.preventDefault();
      if (!progTitle.trim()) return;
      const item: PortalProgram = {
        id: `prog-${Date.now()}`,
        title: progTitle.trim(),
        category: progCategory.trim() || 'Education',
        status: progStatus,
        targetDate: progDate,
        venue: progVenue.trim() || 'NNCHS Campus',
        summary: progSummary.trim() || 'Flagship NNCHS SSLG initiative.',
        photos: progPhotos.length > 0 ? progPhotos : portal.programs[0]?.photos || [],
      };
      onUpdatePortal((prev) => ({ ...prev, programs: [item, ...prev.programs] }));
      setProgTitle('');
      setProgSummary('');
      setProgPhotos([]);
      onNotify('Program added to showcase.');
    };

    const handleAddLf = (e: React.FormEvent) => {
      e.preventDefault();
      if (!lfItemName.trim() || !lfLastSeen.trim()) return;
      const item: LostFoundItem = {
        id: `lf-${Date.now()}`,
        itemCode: `LF-2026-${Math.floor(10 + Math.random() * 89)}`,
        type: lfType,
        itemName: lfItemName.trim(),
        ownerName: lfOwner.trim() || 'Unclaimed',
        lastSeen: lfLastSeen.trim(),
        details: lfDetails.trim() || 'Logged by SSLG Office.',
        contactInfo: lfContact.trim() || 'SSLG Office Room 104',
        photoUrl: lfPhoto || undefined,
        status: 'Open',
      };
      onUpdatePortal((prev) => ({ ...prev, lostFound: [item, ...prev.lostFound] }));
      setLfItemName('');
      setLfOwner('');
      setLfLastSeen('');
      setLfDetails('');
      setLfPhoto('');
      onNotify('Lost & Found record posted.');
    };

    return (
      <div className="space-y-8">
        {/* Programs Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleAddProgram}
            className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-3"
          >
            <h2 className="text-base font-extrabold text-blue-950 dark:text-white">
              Add Program Showcase Card (Multi-Photo Fade)
            </h2>
            <input
              type="text"
              required
              value={progTitle}
              onChange={(e) => setProgTitle(e.target.value)}
              placeholder="Program Title *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={progCategory}
                onChange={(e) => setProgCategory(e.target.value)}
                placeholder="Advocacy Pillar"
                className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <select
                value={progStatus}
                onChange={(e) => setProgStatus(e.target.value as PortalProgram['status'])}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              >
                <option value="Ongoing">Ongoing</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={progDate}
                onChange={(e) => setProgDate(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <input
                type="text"
                value={progVenue}
                onChange={(e) => setProgVenue(e.target.value)}
                placeholder="Venue"
                className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <textarea
              rows={2}
              value={progSummary}
              onChange={(e) => setProgSummary(e.target.value)}
              placeholder="Program description..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-bold cursor-pointer">
              <ImagePlus className="w-3.5 h-3.5" />
              <span>Upload Showcase Photos ({progPhotos.length} selected)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  const urls = await Promise.all(files.slice(0, 5).map(readFileAsDataUrl));
                  setProgPhotos((prev) => [...prev, ...urls]);
                }}
              />
            </label>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-extrabold cursor-pointer"
            >
              Add Program to Showcase
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-3">
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
              Active Programs ({portal.programs.length})
            </h3>
            {portal.programs.map((prog) => (
              <div
                key={prog.id}
                className="p-4 rounded-xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-extrabold text-blue-950 dark:text-white">{prog.title}</p>
                  <p className="text-slate-500 dark:text-slate-300">
                    {prog.category} · {prog.status} · {prog.photos.length} photo(s)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePortal((prev) => ({
                      ...prev,
                      programs: prev.programs.filter((p) => p.id !== prog.id),
                    }))
                  }
                  className="p-1.5 text-slate-400 hover:text-blue-900 dark:hover:text-[#fde047] cursor-pointer"
                  aria-label="Delete program"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Lost & Found Board Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleAddLf}
            className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-3"
          >
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <PackageSearch className="w-4 h-4 text-blue-700 dark:text-[#fde047]" />
              <span>Admin Lost &amp; Found Entry</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={lfType}
                onChange={(e) => setLfType(e.target.value as 'Found' | 'Lost')}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              >
                <option value="Found">Found</option>
                <option value="Lost">Lost</option>
              </select>
              <input
                type="text"
                value={lfOwner}
                onChange={(e) => setLfOwner(e.target.value)}
                placeholder="Owner (optional)"
                className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <input
              type="text"
              required
              value={lfItemName}
              onChange={(e) => setLfItemName(e.target.value)}
              placeholder="Item Name *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <input
              type="text"
              required
              value={lfLastSeen}
              onChange={(e) => setLfLastSeen(e.target.value)}
              placeholder="Last Seen Location & Date *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <input
              type="text"
              value={lfDetails}
              onChange={(e) => setLfDetails(e.target.value)}
              placeholder="Details"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <input
              type="text"
              value={lfContact}
              onChange={(e) => setLfContact(e.target.value)}
              placeholder="Contact / Claim Desk"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-xs font-bold cursor-pointer border border-blue-200 dark:border-slate-700">
              <ImagePlus className="w-3.5 h-3.5" />
              <span>{lfPhoto ? 'Photo Ready' : 'Upload Item Photo'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setLfPhoto(await readFileAsDataUrl(f));
                }}
              />
            </label>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold cursor-pointer"
            >
              Post Lost &amp; Found Item
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-3">
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
              Lost &amp; Found Registry ({portal.lostFound.length})
            </h3>
            {portal.lostFound.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-extrabold text-blue-950 dark:text-white">
                    [{item.type}] {item.itemName}
                  </p>
                  <p className="text-slate-500 dark:text-slate-300">
                    {item.itemCode} · {item.lastSeen}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePortal((prev) => ({
                        ...prev,
                        lostFound: prev.lostFound.map((i) =>
                          i.id === item.id
                            ? { ...i, status: i.status === 'Open' ? 'Claimed' : 'Open' }
                            : i
                        ),
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                      item.status === 'Claimed'
                        ? 'bg-[#facc15] text-slate-950'
                        : 'bg-[#1e3a8a] text-white'
                    }`}
                  >
                    {item.status}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePortal((prev) => ({
                        ...prev,
                        lostFound: prev.lostFound.filter((i) => i.id !== item.id),
                      }))
                    }
                    className="p-1.5 text-slate-400 hover:text-blue-900 dark:hover:text-[#fde047] cursor-pointer"
                    aria-label="Delete lost found item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // TAB 5: DIRECTORIES & LEARNER SERVICES EDITOR
  // =========================================================
  if (activeTab === 'portal-directory') {
    const handleAddOfficer = (e: React.FormEvent) => {
      e.preventDefault();
      if (!offName.trim() || !offPos.trim()) return;
      const officer: PublicOfficer = {
        id: `off-${Date.now()}`,
        fullName: offName.trim(),
        position: offPos.trim(),
        gradeLevel: offGrade.trim() || 'Grade 11',
        section: offSec.trim() || 'NNCHS',
        bio: offBio.trim() || 'Elected student representative serving NNCHS learners.',
        photoUrl: offPhoto || undefined,
        facebookUrl: offFb.trim() || 'https://www.facebook.com/nnchssslg.official',
      };
      onUpdatePortal((prev) => ({ ...prev, officers: [...prev.officers, officer] }));
      setOffName('');
      setOffPos('');
      setOffSec('');
      setOffBio('');
      setOffPhoto('');
      onNotify('SSLG officer profile added.');
    };

    const handleAddClub = (e: React.FormEvent) => {
      e.preventDefault();
      if (!clubName.trim()) return;
      const club: PublicClub = {
        id: `club-${Date.now()}`,
        name: clubName.trim(),
        acronym: clubAcronym.trim() || 'NNCHS CLUB',
        cluster: clubCluster.trim() || 'Academic',
        status: 'Accredited',
        presidentName: clubPres.trim() || 'TBA',
        adviserName: clubAdv.trim() || 'TBA',
        memberCount: Number(clubMembers) || 25,
        description: clubDesc.trim() || 'Recognized NNCHS student organization.',
      };
      onUpdatePortal((prev) => ({ ...prev, clubs: [...prev.clubs, club] }));
      setClubName('');
      setClubAcronym('');
      setClubPres('');
      setClubAdv('');
      setClubDesc('');
      onNotify('Club added to directory.');
    };

    return (
      <div className="space-y-8">
        {/* Learner Services & Footer Contact Info */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-extrabold text-blue-950 dark:text-white">
            Learner Services &amp; Contact Information (Shown in Footer)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Office Location
              </label>
              <input
                type="text"
                value={portal.learnerServicesContact.officeLocation}
                onChange={(e) =>
                  onUpdatePortal((prev) => ({
                    ...prev,
                    learnerServicesContact: {
                      ...prev.learnerServicesContact,
                      officeLocation: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Office Hours
              </label>
              <input
                type="text"
                value={portal.learnerServicesContact.officeHours}
                onChange={(e) =>
                  onUpdatePortal((prev) => ({
                    ...prev,
                    learnerServicesContact: {
                      ...prev.learnerServicesContact,
                      officeHours: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Contact Number
              </label>
              <input
                type="text"
                value={portal.learnerServicesContact.contactNumber}
                onChange={(e) =>
                  onUpdatePortal((prev) => ({
                    ...prev,
                    learnerServicesContact: {
                      ...prev.learnerServicesContact,
                      contactNumber: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={portal.learnerServicesContact.email}
                onChange={(e) =>
                  onUpdatePortal((prev) => ({
                    ...prev,
                    learnerServicesContact: {
                      ...prev.learnerServicesContact,
                      email: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Learner Service Advisory Note
            </label>
            <input
              type="text"
              value={portal.learnerServicesContact.serviceNote}
              onChange={(e) =>
                onUpdatePortal((prev) => ({
                  ...prev,
                  learnerServicesContact: {
                    ...prev.learnerServicesContact,
                    serviceNote: e.target.value,
                  },
                }))
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>
        </div>

        {/* SSLG Officers Directory Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleAddOfficer}
            className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-3"
          >
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700 dark:text-[#fde047]" />
              <span>Add SSLG Officer Profile</span>
            </h3>
            <input
              type="text"
              required
              value={offName}
              onChange={(e) => setOffName(e.target.value)}
              placeholder="Officer Full Name *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <input
              type="text"
              required
              value={offPos}
              onChange={(e) => setOffPos(e.target.value)}
              placeholder="Position (e.g., SSLG Secretary) *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={offGrade}
                onChange={(e) => setOffGrade(e.target.value)}
                placeholder="Grade Level"
                className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <input
                type="text"
                value={offSec}
                onChange={(e) => setOffSec(e.target.value)}
                placeholder="Section"
                className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <input
              type="url"
              value={offFb}
              onChange={(e) => setOffFb(e.target.value)}
              placeholder="Facebook Profile URL"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <textarea
              rows={2}
              value={offBio}
              onChange={(e) => setOffBio(e.target.value)}
              placeholder="Officer bio..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-xs font-bold cursor-pointer border border-blue-200 dark:border-slate-700">
              <ImagePlus className="w-3.5 h-3.5" />
              <span>{offPhoto ? 'Portrait Selected' : 'Upload Portrait'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setOffPhoto(await readFileAsDataUrl(f));
                }}
              />
            </label>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-extrabold cursor-pointer"
            >
              Add Officer to Directory
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-3">
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
              Published Officers ({portal.officers.length})
            </h3>
            {portal.officers.map((off) => (
              <div
                key={off.id}
                className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar fullName={off.fullName} avatarDataUrl={off.photoUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="font-extrabold text-blue-950 dark:text-white truncate">
                        {off.fullName}
                      </p>
                      <p className="text-blue-700 dark:text-[#fde047] font-semibold">
                        {off.position} · {off.gradeLevel} {off.section}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 font-bold cursor-pointer">
                      Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const url = await readFileAsDataUrl(f);
                          onUpdatePortal((prev) => ({
                            ...prev,
                            officers: prev.officers.map((o) =>
                              o.id === off.id ? { ...o, photoUrl: url } : o
                            ),
                          }));
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePortal((prev) => ({
                          ...prev,
                          officers: prev.officers.filter((o) => o.id !== off.id),
                        }))
                      }
                      className="p-1.5 text-slate-400 hover:text-blue-900 dark:hover:text-[#fde047] cursor-pointer"
                      aria-label="Delete officer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={off.bio}
                  onChange={(e) =>
                    onUpdatePortal((prev) => ({
                      ...prev,
                      officers: prev.officers.map((o) =>
                        o.id === off.id ? { ...o, bio: e.target.value } : o
                      ),
                    }))
                  }
                  placeholder="Edit officer bio..."
                  className="w-full px-2.5 py-1.5 rounded border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Registered Clubs Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleAddClub}
            className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-3"
          >
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
              Add Accredited Club / Organization
            </h3>
            <input
              type="text"
              required
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Organization Full Name *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={clubAcronym}
                onChange={(e) => setClubAcronym(e.target.value)}
                placeholder="Acronym"
                className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <input
                type="text"
                value={clubCluster}
                onChange={(e) => setClubCluster(e.target.value)}
                placeholder="Cluster"
                className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={clubPres}
                onChange={(e) => setClubPres(e.target.value)}
                placeholder="Club President"
                className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <input
                type="text"
                value={clubAdv}
                onChange={(e) => setClubAdv(e.target.value)}
                placeholder="Adviser"
                className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <input
              type="number"
              min={1}
              value={clubMembers}
              onChange={(e) => setClubMembers(Number(e.target.value) || 1)}
              placeholder="Active Members"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <textarea
              rows={2}
              value={clubDesc}
              onChange={(e) => setClubDesc(e.target.value)}
              placeholder="Description..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold cursor-pointer"
            >
              Add Club to Directory
            </button>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-2.5">
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
              Registered Clubs ({portal.clubs.length})
            </h3>
            {portal.clubs.map((club) => (
              <div
                key={club.id}
                className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-extrabold text-blue-950 dark:text-white truncate">
                    {club.name} ({club.acronym})
                  </p>
                  <p className="text-slate-500 dark:text-slate-300">
                    {club.cluster} · Pres. {club.presidentName} · {club.memberCount} members
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePortal((prev) => ({
                      ...prev,
                      clubs: prev.clubs.filter((c) => c.id !== club.id),
                    }))
                  }
                  className="p-1.5 text-slate-400 hover:text-blue-900 dark:hover:text-[#fde047] cursor-pointer"
                  aria-label="Delete club"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // TAB 6: RESOLUTIONS (PDF), CALENDAR & FUNDS EDITOR
  // =========================================================
  const handleAddResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resCode.trim() || !resTitle.trim()) return;
    const item: LegislativeRecord = {
      id: `res-${Date.now()}`,
      numberCode: resCode.trim(),
      title: resTitle.trim(),
      datePassed: resDate,
      sponsor: resSponsor.trim() || 'SSLG Executive Council',
      summary: resSummary.trim() || 'Enacted NNCHS SSLG resolution.',
      fullText: resFullText.trim() || resSummary.trim() || resTitle.trim(),
      attachedPdfDataUrl: resPdfDataUrl || undefined,
      attachedPdfName: resPdfName || undefined,
    };
    onUpdatePortal((prev) => ({ ...prev, resolutions: [item, ...prev.resolutions] }));
    setResTitle('');
    setResSummary('');
    setResFullText('');
    setResPdfDataUrl('');
    setResPdfName('');
    onNotify(`${item.numberCode} published to Resolutions Repository.`);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calTitle.trim()) return;
    const ev: CalendarEventItem = {
      id: `cal-${Date.now()}`,
      title: calTitle.trim(),
      date: calDate,
      timeRange: calTime.trim() || '8:00 AM',
      category: calCat,
      venue: calVenue.trim() || 'NNCHS',
      description: calDesc.trim() || 'Official NNCHS SSLG activity.',
    };
    onUpdatePortal((prev) => ({
      ...prev,
      calendarEvents: [...prev.calendarEvents, ev],
    }));
    setCalTitle('');
    setCalDesc('');
    onNotify('Activity added to SSLG Calendar.');
  };

  const handleAddFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundCat.trim()) return;
    const item: FundAllocationItem = {
      id: `fund-${Date.now()}`,
      category: fundCat.trim(),
      allocatedAmount: Number(fundAlloc) || 0,
      spentAmount: Number(fundSpent) || 0,
      notes: fundNotes.trim() || 'Approved allocation line.',
    };
    onUpdatePortal((prev) => ({ ...prev, funds: [...prev.funds, item] }));
    setFundCat('');
    setFundNotes('');
    onNotify('Budget category added.');
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError('');
    if (!authToken) {
      setCredError('Backend Admin token unavailable on this static host.');
      return;
    }
    if (credNewPassword && credNewPassword.length < 6) {
      setCredError('New password must be at least 6 characters.');
      return;
    }
    if (credNewPassword && credNewPassword !== credConfirmPassword) {
      setCredError('Password confirmation does not match.');
      return;
    }

    setCredSaving(true);
    try {
      const res = await fetch(buildApiUrl('/api/admin/change-credentials'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          currentPassword: credCurrentPassword,
          newUsername: credUsername.trim(),
          newPassword: credNewPassword || undefined,
        }),
      });
      const data = (await res.json()) as {
        username?: string;
        token?: string;
        error?: string;
      };
      if (!res.ok || !data.token) {
        setCredError(data.error || 'Unable to update admin credentials.');
        return;
      }
      setCredCurrentPassword('');
      setCredNewPassword('');
      setCredConfirmPassword('');
      onCredentialsUpdated?.(data.username || credUsername.trim(), data.token);
      onNotify(`Admin credentials updated (${data.username || credUsername.trim()}).`);
    } catch {
      setCredError('Unable to reach server Admin credentials endpoint.');
    } finally {
      setCredSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 0. Global Cloud Sync & Snapshot Backup */}
      <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
              <span>Global Multi-User Cloud Sync &amp; Backup</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Publish website edits to all visitors across devices, configure an external Cloud Sync webhook (JSONBin / Google Apps Script), or export/import JSON snapshots.
            </p>
          </div>
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border inline-flex items-center gap-1.5 ${
              syncMode === 'cloud' || syncMode === 'server'
                ? 'bg-[#facc15]/25 text-blue-950 dark:text-[#fde047] border-[#eab308]'
                : 'bg-blue-50 dark:bg-slate-800 text-blue-900 dark:text-slate-200 border-blue-200 dark:border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {syncMode === 'cloud'
                ? 'Live Cloud Sync Connected'
                : syncMode === 'server'
                ? 'Shared Server Sync Connected'
                : 'Local Browser Cache Mode'}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-7">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Live Shared Cloud Sync Endpoint (Defaulted Automatically for All Devices)
            </label>
            <input
              type="url"
              value={syncApiUrlInput}
              onChange={(e) => setSyncApiUrlInput(e.target.value)}
              placeholder={SHARED_CLOUD_URL}
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="lg:col-span-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={syncing}
              onClick={async () => {
                const resolved = normalizeCloudSyncUrl(syncApiUrlInput);
                setSyncApiUrlInput(resolved);
                saveSyncConfig({ syncApiUrl: resolved });
                onNotify(
                  syncApiUrlInput.trim()
                    ? 'Live Cloud Sync URL saved. Syncing latest shared data...'
                    : 'Reset to default Shared Cloud Database. Syncing latest data...'
                );
                await onPullCloudNow?.();
              }}
              className="px-3.5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5 text-[#fde047]" />
              <span>Save Sync URL</span>
            </button>
            {onPullCloudNow && (
              <button
                type="button"
                disabled={syncing}
                onClick={() => void onPullCloudNow()}
                className="px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-950 dark:text-slate-100 border border-blue-200 dark:border-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>Sync Latest</span>
              </button>
            )}
            {onPublishNow && (
              <button
                type="button"
                disabled={syncing}
                onClick={() => void onPublishNow()}
                className="px-3.5 py-2 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Publish Updates Now</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Last published sync:{' '}
            <strong className="text-blue-950 dark:text-slate-200">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Local state active'}
            </strong>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `nnchs-sslg-snapshot-${new Date().toISOString().slice(0, 10)}.json`,
                  exportPortalSnapshotJson(portal),
                  'application/json;charset=utf-8',
                  onNotify
                )
              }
              className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 text-blue-900 dark:text-[#fde047] border border-blue-200 dark:border-slate-700 font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Snapshot</span>
            </button>
            <button
              type="button"
              onClick={() => snapshotImportRef.current?.click()}
              className="px-3.5 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#fde047]" />
              <span>Import JSON Snapshot</span>
            </button>
            <input
              ref={snapshotImportRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const raw = await f.text();
                  const parsedState = parsePortalSnapshotJson(raw);
                  if (onImportSnapshot) {
                    await onImportSnapshot(parsedState);
                  } else {
                    onUpdatePortal(() => parsedState);
                    onNotify('JSON Snapshot imported cleanly.');
                  }
                } catch (err) {
                  onNotify(
                    err instanceof Error ? err.message : 'Unable to parse selected JSON snapshot.'
                  );
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* 1. Resolutions & PDF Repository */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleAddResolution}
          className="lg:col-span-5 backdrop-blur-md bg-white/80 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 space-y-3"
        >
          <h2 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
            <span>Publish SSLG Resolution (with Real PDF)</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={resCode}
              onChange={(e) => setResCode(e.target.value)}
              placeholder="Resolution No. *"
              className="px-3 py-2 text-xs font-mono-code font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <input
              type="date"
              required
              value={resDate}
              onChange={(e) => setResDate(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>
          <input
            type="text"
            required
            value={resTitle}
            onChange={(e) => setResTitle(e.target.value)}
            placeholder="Resolution Title *"
            className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <input
            type="text"
            value={resSponsor}
            onChange={(e) => setResSponsor(e.target.value)}
            placeholder="Sponsoring Officers"
            className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <textarea
            rows={2}
            value={resSummary}
            onChange={(e) => setResSummary(e.target.value)}
            placeholder="Short summary..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <textarea
            rows={3}
            value={resFullText}
            onChange={(e) => setResFullText(e.target.value)}
            placeholder="Full resolution text (auto-generated into downloadable PDF if no custom PDF attached)..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-bold cursor-pointer">
            <FileUp className="w-3.5 h-3.5" />
            <span>{resPdfName ? `PDF Attached: ${resPdfName}` : 'Attach Official .PDF (Optional)'}</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setResPdfName(f.name);
                setResPdfDataUrl(await readFileAsDataUrl(f));
              }}
            />
          </label>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-extrabold cursor-pointer"
          >
            Publish Resolution
          </button>
        </form>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-3">
          <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
            Enacted Resolutions ({portal.resolutions.length})
          </h3>
          {portal.resolutions.map((rec) => (
            <div
              key={rec.id}
              className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <p className="font-extrabold text-blue-950 dark:text-white">
                  {rec.numberCode}: {rec.title}
                </p>
                <p className="text-slate-500 dark:text-slate-300">
                  {rec.datePassed} · {rec.attachedPdfName ? `Attached PDF: ${rec.attachedPdfName}` : 'Generated PDF via jsPDF'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadResolutionPdf(rec, onNotify)}
                  className="px-3 py-1.5 rounded-lg bg-[#facc15] text-slate-950 font-extrabold cursor-pointer"
                >
                  Test PDF
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePortal((prev) => ({
                      ...prev,
                      resolutions: prev.resolutions.filter((r) => r.id !== rec.id),
                    }))
                  }
                  className="p-1.5 text-slate-400 hover:text-blue-900 dark:hover:text-[#fde047] cursor-pointer"
                  aria-label="Delete resolution"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. SSLG Funds & Budget Overview Editor */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-4">
        <h3 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
          <span>SSLG Funds &amp; Budget Allocation Editor</span>
        </h3>

        <div className="space-y-2.5">
          {portal.funds.map((f) => (
            <div
              key={f.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 rounded-xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 text-xs"
            >
              <input
                type="text"
                value={f.category}
                onChange={(e) =>
                  onUpdatePortal((prev) => ({
                    ...prev,
                    funds: prev.funds.map((item) =>
                      item.id === f.id ? { ...item, category: e.target.value } : item
                    ),
                  }))
                }
                className="md:col-span-4 px-2.5 py-1.5 font-bold rounded border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
              <div className="md:col-span-2">
                <input
                  type="number"
                  value={f.allocatedAmount}
                  onChange={(e) =>
                    onUpdatePortal((prev) => ({
                      ...prev,
                      funds: prev.funds.map((item) =>
                        item.id === f.id
                          ? { ...item, allocatedAmount: Number(e.target.value) || 0 }
                          : item
                      ),
                    }))
                  }
                  aria-label="Allocated amount"
                  className="w-full px-2.5 py-1.5 font-mono-code rounded border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                />
              </div>
              <div className="md:col-span-2">
                <input
                  type="number"
                  value={f.spentAmount}
                  onChange={(e) =>
                    onUpdatePortal((prev) => ({
                      ...prev,
                      funds: prev.funds.map((item) =>
                        item.id === f.id
                          ? { ...item, spentAmount: Number(e.target.value) || 0 }
                          : item
                      ),
                    }))
                  }
                  aria-label="Disbursed amount"
                  className="w-full px-2.5 py-1.5 font-mono-code rounded border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                />
              </div>
              <input
                type="text"
                value={f.notes}
                onChange={(e) =>
                  onUpdatePortal((prev) => ({
                    ...prev,
                    funds: prev.funds.map((item) =>
                      item.id === f.id ? { ...item, notes: e.target.value } : item
                    ),
                  }))
                }
                className="md:col-span-3 px-2.5 py-1.5 rounded border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-900"
              />
              <button
                type="button"
                onClick={() =>
                  onUpdatePortal((prev) => ({
                    ...prev,
                    funds: prev.funds.filter((item) => item.id !== f.id),
                  }))
                }
                className="md:col-span-1 p-1.5 text-slate-400 hover:text-blue-900 dark:hover:text-[#fde047] flex justify-center cursor-pointer"
                aria-label="Delete budget line"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleAddFund}
          className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800"
        >
          <input
            type="text"
            required
            value={fundCat}
            onChange={(e) => setFundCat(e.target.value)}
            placeholder="New budget line category..."
            className="md:col-span-4 px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <input
            type="number"
            value={fundAlloc}
            onChange={(e) => setFundAlloc(Number(e.target.value) || 0)}
            placeholder="Allocated PHP"
            className="md:col-span-2 px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <input
            type="number"
            value={fundSpent}
            onChange={(e) => setFundSpent(Number(e.target.value) || 0)}
            placeholder="Disbursed PHP"
            className="md:col-span-2 px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <input
            type="text"
            value={fundNotes}
            onChange={(e) => setFundNotes(e.target.value)}
            placeholder="Notes..."
            className="md:col-span-3 px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <button
            type="submit"
            className="md:col-span-1 py-2 px-3 rounded-lg bg-[#1e3a8a] text-white text-xs font-extrabold cursor-pointer"
          >
            Add
          </button>
        </form>
      </div>

      {/* 3. SSLG Activity Calendar Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleAddEvent}
          className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-3"
        >
          <h3 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-700 dark:text-[#fde047]" />
            <span>Add Activity Calendar Event</span>
          </h3>
          <input
            type="text"
            required
            value={calTitle}
            onChange={(e) => setCalTitle(e.target.value)}
            placeholder="Event Title *"
            className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              required
              value={calDate}
              onChange={(e) => setCalDate(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <input
              type="text"
              value={calTime}
              onChange={(e) => setCalTime(e.target.value)}
              placeholder="Time Range"
              className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={calCat}
              onChange={(e) => setCalCat(e.target.value as CalendarEventItem['category'])}
              className="px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            >
              <option value="School-Wide Events">School-Wide Events</option>
              <option value="Club Activities">Club Activities</option>
              <option value="Examinations">Examinations</option>
              <option value="Division/District Events">Division/District Events</option>
            </select>
            <input
              type="text"
              value={calVenue}
              onChange={(e) => setCalVenue(e.target.value)}
              placeholder="Venue"
              className="px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>
          <textarea
            rows={2}
            value={calDesc}
            onChange={(e) => setCalDesc(e.target.value)}
            placeholder="Event notes..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold cursor-pointer"
          >
            Add Calendar Event
          </button>
        </form>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-2.5">
          <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
            Scheduled Events ({portal.calendarEvents.length})
          </h3>
          {portal.calendarEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <p className="font-extrabold text-blue-950 dark:text-white">{ev.title}</p>
                <p className="text-slate-500 dark:text-slate-300">
                  {ev.date} · {ev.timeRange} · {ev.venue}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdatePortal((prev) => ({
                    ...prev,
                    calendarEvents: prev.calendarEvents.filter((c) => c.id !== ev.id),
                  }))
                }
                className="p-1.5 text-slate-400 hover:text-blue-900 dark:hover:text-[#fde047] cursor-pointer"
                aria-label="Delete calendar event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Website Admin Account Credentials Manager */}
      <form
        onSubmit={handleSaveCredentials}
        className="backdrop-blur-md bg-white/80 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 space-y-4"
      >
        <div>
          <h3 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-700 dark:text-[#fde047]" />
            <span>Update Website Admin Login Credentials</span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            Change the Website CMS Administrator username or password securely on the server.
          </p>
        </div>

        {credError && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 text-xs font-bold text-blue-950 dark:text-[#fde047]">
            {credError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              New Admin Username
            </label>
            <input
              type="text"
              required
              value={credUsername}
              onChange={(e) => setCredUsername(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Current Password *
            </label>
            <input
              type="password"
              required
              value={credCurrentPassword}
              onChange={(e) => setCredCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              New Password (min. 6 chars)
            </label>
            <input
              type="password"
              minLength={6}
              value={credNewPassword}
              onChange={(e) => setCredNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              minLength={6}
              value={credConfirmPassword}
              onChange={(e) => setCredConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={credSaving || !authToken}
          className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-[#fde047]" />
          <span>{credSaving ? 'Saving Credentials...' : 'Save Admin Credentials'}</span>
        </button>
      </form>
    </div>
  );
}
