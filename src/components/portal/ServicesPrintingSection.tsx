import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  MessageSquare,
  PackageSearch,
  Printer,
  Search,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import {
  downloadFileSafe,
  generatePrintReceiptText,
} from '../../lib/downloadEngine.ts';
import {
  SSLG_ADMIN_SMS_NUMBER,
  buildSmsAlertPayload,
  generatePrintJobCode,
  type DownloadableResource,
  type LostFoundItem,
  type PortalProgram,
  type PortalState,
  type PrintRequestJob,
  type SmsDispatchLog,
} from '../../lib/portalStore.ts';
import type { LetterheadDocumentPayload } from '../DocumentLetterheadModal.tsx';

export type ServicesSubTab = 'printing' | 'programs' | 'lostfound' | 'downloads';

function formatCountdown(targetIso: string): string {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (Number.isNaN(diff)) return targetIso;
  if (diff <= 0) return 'Target Date Reached';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  return `${days}d ${hours}h remaining`;
}

export function ServicesPrintingSection({
  portal,
  initialSubTab = 'printing',
  onSubmitPrintJob,
  onSubmitLostReport,
  onOpenLetterhead,
  onNotify,
}: {
  portal: PortalState;
  initialSubTab?: ServicesSubTab;
  onSubmitPrintJob: (job: PrintRequestJob, smsLog: SmsDispatchLog) => void;
  onSubmitLostReport: (item: LostFoundItem) => void;
  onOpenLetterhead: (doc: LetterheadDocumentPayload) => void;
  onNotify: (message: string) => void;
}) {
  const [subTab, setSubTab] = useState<ServicesSubTab>(initialSubTab);

  // Free Printing Form State
  const [studentName, setStudentName] = useState('');
  const [gradeSection, setGradeSection] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [purpose, setPurpose] = useState<PrintRequestJob['purpose']>('Academic / Assignment');
  const [documentTitle, setDocumentTitle] = useState('');
  const [attachmentReference, setAttachmentReference] = useState('');
  const [pageCount, setPageCount] = useState<number>(5);
  const [printMode, setPrintMode] = useState<PrintRequestJob['printMode']>(
    'Black & White (Single-Sided)'
  );
  const [claimSlot, setClaimSlot] = useState<PrintRequestJob['claimSlot']>(
    'Lunch Break (12:00–1:00 PM)'
  );
  const [formError, setFormError] = useState('');
  const [dispatchedReceipt, setDispatchedReceipt] = useState<{
    job: PrintRequestJob;
    smsBody: string;
  } | null>(null);
  const [smsCopied, setSmsCopied] = useState(false);

  // Public Print Queue Search
  const [queueSearch, setQueueSearch] = useState('');

  // Programs filter + modal
  const [programFilter, setProgramFilter] = useState<
    'All' | PortalProgram['status']
  >('All');
  const [activeProgram, setActiveProgram] = useState<PortalProgram | null>(null);

  // Lost & Found form
  const [lfSearch, setLfSearch] = useState('');
  const [lfItemName, setLfItemName] = useState('');
  const [lfLocation, setLfLocation] = useState('');
  const [lfDescription, setLfDescription] = useState('');
  const [lfSuccessMsg, setLfSuccessMsg] = useState('');

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDispatchedReceipt(null);
        setActiveProgram(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filteredQueue = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    if (!q) return portal.printJobs.slice(0, 8);
    return portal.printJobs.filter(
      (j) =>
        j.jobCode.toLowerCase().includes(q) ||
        j.studentName.toLowerCase().includes(q) ||
        j.gradeSection.toLowerCase().includes(q) ||
        j.documentTitle.toLowerCase().includes(q)
    );
  }, [portal.printJobs, queueSearch]);

  const filteredPrograms = useMemo(() => {
    if (programFilter === 'All') return portal.programs;
    return portal.programs.filter((p) => p.status === programFilter);
  }, [portal.programs, programFilter]);

  const filteredLostFound = useMemo(() => {
    const q = lfSearch.trim().toLowerCase();
    if (!q) return portal.lostFound;
    return portal.lostFound.filter(
      (item) =>
        item.itemName.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q)
    );
  }, [portal.lostFound, lfSearch]);

  const handleFileAttachmentPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setAttachmentReference(`${f.name} (${Math.max(1, Math.round(f.size / 1024))} KB)`);
    }
  };

  const handleSubmitPrint = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!studentName.trim() || !gradeSection.trim() || !documentTitle.trim()) {
      setFormError('Please fill in your Student Name, Grade & Section, and Document Title.');
      return;
    }
    if (!Number.isFinite(pageCount) || pageCount < 1 || pageCount > 15) {
      setFormError('Daily free printing quota is strictly 1 to 15 Black & White pages per student.');
      return;
    }

    const nowIso = new Date().toISOString();
    const jobCode = generatePrintJobCode(portal.printJobs);
    const newJob: PrintRequestJob = {
      id: `prt-${Date.now()}`,
      jobCode,
      studentName: studentName.trim(),
      gradeSection: gradeSection.trim(),
      contactNumber: contactNumber.trim(),
      purpose,
      documentTitle: documentTitle.trim(),
      attachmentReference: attachmentReference.trim() || 'Walk-in USB / School Drive at Room 104',
      pageCount: Math.round(pageCount),
      printMode,
      claimSlot,
      status: 'Pending SMS Review',
      submittedAt: nowIso,
      adminNotes: `Queued via Public Portal. SMS alert logged for Admin (${SSLG_ADMIN_SMS_NUMBER}).`,
      smsDispatched: true,
    };

    const smsBody = buildSmsAlertPayload(newJob);
    const smsLog: SmsDispatchLog = {
      id: `sms-${Date.now()}`,
      recipient: SSLG_ADMIN_SMS_NUMBER,
      jobCode,
      studentName: newJob.studentName,
      messageBody: smsBody,
      dispatchedAt: nowIso,
      deliveryStatus: 'Queued / Dispatched',
    };

    onSubmitPrintJob(newJob, smsLog);
    setDispatchedReceipt({ job: newJob, smsBody });
    setSmsCopied(false);

    setStudentName('');
    setGradeSection('');
    setContactNumber('');
    setDocumentTitle('');
    setAttachmentReference('');
    setPageCount(5);
  };

  const handleCopySmsBody = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSmsCopied(true);
      onNotify('SMS dispatch alert text copied.');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setSmsCopied(true);
        onNotify('SMS dispatch alert text copied.');
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const handleLostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lfItemName.trim() || !lfLocation.trim()) return;
    const code = `LF-2026-${Math.floor(100 + Math.random() * 899)}`;
    const newItem: LostFoundItem = {
      id: `lf-${Date.now()}`,
      itemCode: code,
      type: 'Lost Report',
      itemName: lfItemName.trim(),
      location: lfLocation.trim(),
      dateReported: new Date().toISOString().slice(0, 10),
      description: lfDescription.trim() || 'Submitted via NNCHS SSLG Zero-Login Lost & Found Board.',
      reporterOrCustodian: 'Reported via Public Portal',
      status: 'Looking for Owner',
    };
    onSubmitLostReport(newItem);
    setLfItemName('');
    setLfLocation('');
    setLfDescription('');
    setLfSuccessMsg(`Lost item bulletin ${code} posted to the NNCHS Lost & Found Board.`);
    onNotify(`Lost item ${code} published.`);
  };

  const openResourceLetterhead = (res: DownloadableResource) => {
    onOpenLetterhead({
      title: res.title,
      docCode: res.code,
      categoryLabel: res.category,
      dateLabel: `Updated ${res.updatedAt}`,
      filename: res.filename,
      bodyText: res.fullText,
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
            Zero-Login Student Services · Room 104
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Services, Free Printing &amp; Flagship Programs
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Direct academic printing support with automated SMS alert to SSLG Admin (
            <span className="font-mono-code font-bold text-slate-900 dark:text-white">
              {SSLG_ADMIN_SMS_NUMBER}
            </span>
            ), campus Lost &amp; Found, and downloadable templates.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start lg:self-auto">
          {[
            { id: 'printing' as const, label: 'Free Printing & SMS' },
            { id: 'programs' as const, label: 'Programs Showcase' },
            { id: 'lostfound' as const, label: 'Lost & Found' },
            { id: 'downloads' as const, label: 'Downloadables & Forms' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                subTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: FREE PRINTING SERVICES + AUTOMATED SMS ALERT TO 09163866252 */}
      {subTab === 'printing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Request Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-800 dark:text-blue-400" />
                  <span>Project LIBRE-PRINT Request Form</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  No login needed · Up to 15 free Black &amp; White pages daily · Instant SMS alert
                  to SSLG Admin ({SSLG_ADMIN_SMS_NUMBER})
                </p>
              </div>
              <span className="font-mono-code text-xs font-bold text-amber-700 dark:text-amber-400">
                QUOTA: MAX 15 PAGES
              </span>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-800 dark:text-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitPrint} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g., Juan Dela Cruz"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Grade &amp; Section *
                  </label>
                  <input
                    type="text"
                    required
                    value={gradeSection}
                    onChange={(e) => setGradeSection(e.target.value)}
                    placeholder="e.g., 11 - STEM B Bonifacio"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Student Mobile No. (Optional)
                  </label>
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="e.g., 09XX-XXX-XXXX"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Academic Purpose *
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as PrintRequestJob['purpose'])}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Academic / Assignment">Academic / Assignment</option>
                    <option value="Research Paper">Research Paper</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="Club / Org Paper">Club / Org Paper</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Document Title / Description *
                </label>
                <input
                  type="text"
                  required
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="e.g., Practical Research 2 Chapter 1–2 Draft"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    File Name / Link Reference
                  </label>
                  <input
                    type="text"
                    value={attachmentReference}
                    onChange={(e) => setAttachmentReference(e.target.value)}
                    placeholder="Paste Drive link or pick local file"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Or Select File to Tag Name
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileAttachmentPick}
                    className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-slate-200 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Page Count (1–15) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    required
                    value={pageCount}
                    onChange={(e) => setPageCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Print Mode
                  </label>
                  <select
                    value={printMode}
                    onChange={(e) => setPrintMode(e.target.value as PrintRequestJob['printMode'])}
                    className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Black & White (Single-Sided)">B&amp;W Single-Sided</option>
                    <option value="Black & White (Back-to-Back)">B&amp;W Back-to-Back</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Preferred Claim Slot
                  </label>
                  <select
                    value={claimSlot}
                    onChange={(e) => setClaimSlot(e.target.value as PrintRequestJob['claimSlot'])}
                    className="w-full px-3 py-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Morning Recess (9:30–10:00 AM)">Morning Recess (9:30–10 AM)</option>
                    <option value="Lunch Break (12:00–1:00 PM)">Lunch Break (12–1 PM)</option>
                    <option value="Dismissal (4:00–4:45 PM)">Dismissal (4:00–4:45 PM)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-5 rounded-xl bg-[#1e3a8a] hover:bg-[#0f172a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-amber-300" />
                <span>Submit Print Request &amp; Dispatch SMS Alert to {SSLG_ADMIN_SMS_NUMBER}</span>
              </button>
            </form>
          </div>

          {/* Public Print Queue & Claim Status Checker */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                Public Print Queue &amp; Claim Checker
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Look up your <span className="font-mono-code font-bold">PRT-2026-XXXX</span> code
                before heading to SSLG Office (Room 104).
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder="Search PRT-2026 code or student name..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2.5 max-h-[430px] overflow-y-auto pr-1">
              {filteredQueue.map((job) => (
                <div
                  key={job.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-code text-xs font-extrabold text-blue-800 dark:text-blue-400">
                      {job.jobCode}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        job.status === 'Ready for Claim'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : job.status === 'Printing in Progress'
                          ? 'text-amber-700 dark:text-amber-400'
                          : job.status === 'Claimed'
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {job.documentTitle}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {job.studentName} ({job.gradeSection}) · {job.pageCount}p · {job.claimSlot}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      SMS Alert: {job.smsDispatched ? `Sent (${SSLG_ADMIN_SMS_NUMBER})` : 'Pending'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenLetterhead({
                          title: `Print Queue Slip — ${job.jobCode}`,
                          docCode: job.jobCode,
                          categoryLabel: 'Project LIBRE-PRINT',
                          dateLabel: new Date(job.submittedAt).toLocaleDateString('en-PH'),
                          filename: `${job.jobCode}_Receipt.txt`,
                          bodyText: generatePrintReceiptText(job),
                        })
                      }
                      className="text-[11px] font-bold text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      View / Print Slip →
                    </button>
                  </div>
                </div>
              ))}
              {filteredQueue.length === 0 && (
                <p className="text-xs text-center text-slate-500 dark:text-slate-400 py-8">
                  No print jobs match your search query.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROGRAMS & INITIATIVES SHOWCASE */}
      {subTab === 'programs' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {(['All', 'Ongoing', 'Open for Registration', 'Upcoming', 'Completed'] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setProgramFilter(status)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    programFilter === status
                      ? 'bg-blue-900 text-white border-blue-900 dark:bg-blue-600 dark:border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {status}
                </button>
              )
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map((prog) => (
              <div
                key={prog.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <span className="text-blue-800 dark:text-blue-400">{prog.coreValue}</span>
                    <span
                      className={
                        prog.status === 'Ongoing' || prog.status === 'Open for Registration'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : prog.status === 'Completed'
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }
                    >
                      {prog.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white leading-snug">
                    {prog.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {prog.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatCountdown(prog.targetDate)}</span>
                    </span>
                    <span>{prog.venue}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveProgram(prog)}
                    className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold cursor-pointer"
                  >
                    View Program Brief
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: NNCHS LOST & FOUND DIGITAL BOARD */}
      {subTab === 'lostfound' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={lfSearch}
                onChange={(e) => setLfSearch(e.target.value)}
                placeholder="Search found calculators, tumblers, IDs, or location..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-3">
              {filteredLostFound.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-mono-code font-bold text-blue-800 dark:text-blue-400">
                      {item.itemCode} · {item.type}
                    </span>
                    <span
                      className={`font-bold ${
                        item.status === 'Claimed'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-950 dark:text-white">
                    {item.itemName}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{item.description}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    Location: <strong className="text-slate-700 dark:text-slate-200">{item.location}</strong> · Reported {item.dateReported} · {item.reporterOrCustodian}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <PackageSearch className="w-5 h-5 text-amber-600" />
              <span>Report a Lost Item (No Login)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Post missing items on the campus Lost &amp; Found board. Found valuables turned in are
              held safely by the SSLG Protocol Officer at Room 104.
            </p>
            {lfSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                {lfSuccessMsg}
              </div>
            )}
            <form onSubmit={handleLostSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={lfItemName}
                  onChange={(e) => setLfItemName(e.target.value)}
                  placeholder="e.g., Blue Pencil Case / Student ID"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Last Seen Campus Location *
                </label>
                <input
                  type="text"
                  required
                  value={lfLocation}
                  onChange={(e) => setLfLocation(e.target.value)}
                  placeholder="e.g., Covered Court / Grade 10 Corridor"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Identifying Marks / Description
                </label>
                <textarea
                  rows={3}
                  value={lfDescription}
                  onChange={(e) => setLfDescription(e.target.value)}
                  placeholder="Color, brand, stickers, or section label..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
              >
                Post to Lost &amp; Found Board
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: DOWNLOADABLES & FORMS HUB */}
      {subTab === 'downloads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portal.downloadables.map((res) => (
            <div
              key={res.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-blue-800 dark:text-blue-400">{res.category}</span>
                  <span className="font-mono-code text-slate-500 dark:text-slate-400">
                    {res.code}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-start gap-2">
                  <FileText className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <span>{res.title}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {res.summary}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadFileSafe(res.filename, res.fullText, 'text/plain;charset=utf-8', onNotify)
                  }
                  className="px-3.5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#0f172a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
                <button
                  type="button"
                  onClick={() => openResourceLetterhead(res)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>View, Copy &amp; Save as PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SMS Dispatch Confirmation Modal */}
      {dispatchedReceipt && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDispatchedReceipt(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Free Printing SMS Alert Dispatched"
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                    Print Request &amp; SMS Alert Logged
                  </p>
                  <h3 className="text-base font-extrabold">{dispatchedReceipt.job.jobCode}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchedReceipt(null)}
                aria-label="Close confirmation modal"
                className="p-1 text-emerald-100 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                Your print request has been added to the public queue and queued in the{' '}
                <strong>SSLG Admin SMS Notification Log</strong> for{' '}
                <span className="font-mono-code font-bold">{SSLG_ADMIN_SMS_NUMBER}</span>.
              </p>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                    <span>Formatted SMS Alert Payload ({SSLG_ADMIN_SMS_NUMBER})</span>
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-mono-code text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  {dispatchedReceipt.smsBody}
                </pre>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCopySmsBody(dispatchedReceipt.smsBody)}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {smsCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{smsCopied ? 'Copied SMS' : 'Copy SMS Text'}</span>
                </button>
                <a
                  href={`sms:${SSLG_ADMIN_SMS_NUMBER}?body=${encodeURIComponent(dispatchedReceipt.smsBody)}`}
                  className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Open Phone SMS App ({SSLG_ADMIN_SMS_NUMBER})</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const job = dispatchedReceipt.job;
                    setDispatchedReceipt(null);
                    onOpenLetterhead({
                      title: `Print Queue Slip — ${job.jobCode}`,
                      docCode: job.jobCode,
                      categoryLabel: 'Project LIBRE-PRINT',
                      dateLabel: new Date(job.submittedAt).toLocaleDateString('en-PH'),
                      filename: `${job.jobCode}_Receipt.txt`,
                      bodyText: generatePrintReceiptText(job),
                    });
                  }}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Claim Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Program Details Modal */}
      {activeProgram && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveProgram(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activeProgram.title}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-400">
                  {activeProgram.coreValue} · {activeProgram.status}
                </p>
                <h3 className="text-base font-bold">{activeProgram.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveProgram(null)}
                aria-label="Close program brief"
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p className="leading-relaxed">{activeProgram.summary}</p>
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Lead Committee</span>
                  <strong className="text-slate-950 dark:text-white">{activeProgram.committee}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Venue</span>
                  <strong className="text-slate-950 dark:text-white">{activeProgram.venue}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Target Date</span>
                  <strong className="text-slate-950 dark:text-white">{activeProgram.targetDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Beneficiaries</span>
                  <strong className="text-slate-950 dark:text-white">{activeProgram.beneficiaries}</strong>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveProgram(null)}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Close Brief</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
