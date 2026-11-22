import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileUp,
  Link2,
  Printer,
  Search,
} from 'lucide-react';
import {
  PRINT_TIMELINE_STEPS,
  generatePrintJobCode,
  readFileAsDataUrl,
  type PortalState,
  type PrintJobStatus,
  type PrintRequestJob,
} from '../../lib/portalStore.ts';

export function DotTimelineTracker({ currentStatus }: { currentStatus: PrintJobStatus }) {
  const currentIdx = Math.max(
    0,
    PRINT_TIMELINE_STEPS.findIndex((s) => s === currentStatus)
  );

  return (
    <div className="w-full py-2">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-1 relative">
        {PRINT_TIMELINE_STEPS.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div
              key={step}
              className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 flex-1 relative"
            >
              {/* Connecting Horizontal Line on Desktop */}
              {idx < PRINT_TIMELINE_STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={`hidden sm:block absolute top-3 left-1/2 w-full h-1 ${
                    isCompleted ? 'bg-[#facc15]' : 'bg-blue-100 dark:bg-slate-700'
                  }`}
                />
              )}

              {/* Dot Circle */}
              <div
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors ${
                  isCurrent
                    ? 'bg-[#facc15] border-[#1e3a8a] text-slate-950 scale-110'
                    : isCompleted
                    ? 'bg-[#1e3a8a] border-[#1e3a8a] text-[#fde047]'
                    : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-slate-600 text-slate-400'
                }`}
              >
                <span className="text-[10px] font-extrabold tabular-nums">{idx + 1}</span>
              </div>

              <span
                className={`text-[11px] leading-tight max-w-[130px] ${
                  isCurrent
                    ? 'font-extrabold text-blue-950 dark:text-[#fde047]'
                    : isCompleted
                    ? 'font-bold text-blue-800 dark:text-blue-300'
                    : 'font-medium text-slate-500 dark:text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ServicesPrintingSection({
  portal,
  onSubmitPrintJob,
  onNotify,
}: {
  portal: PortalState;
  onSubmitPrintJob: (job: PrintRequestJob) => void;
  onNotify: (msg: string) => void;
}) {
  const [studentName, setStudentName] = useState('');
  const [gradeSection, setGradeSection] = useState('');
  const [copies, setCopies] = useState<number>(1);
  const [colorOption, setColorOption] = useState<'Black & White' | 'Colored Print'>(
    'Black & White'
  );
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    mimeType: string;
    size: number;
    dataUrl: string;
  } | null>(null);
  const [fileLink, setFileLink] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submittedJob, setSubmittedJob] = useState<PrintRequestJob | null>(null);

  // Track Print Request lookup
  const [lookupCode, setLookupCode] = useState('');
  const [trackedJob, setTrackedJob] = useState<PrintRequestJob | null>(
    portal.printJobs[0] || null
  );

  const liveTrackedJob = useMemo(() => {
    if (!trackedJob) return null;
    return portal.printJobs.find((j) => j.id === trackedJob.id) || trackedJob;
  }, [portal.printJobs, trackedJob]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError('');
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setFormError(
        'File exceeds 4 MB browser storage limit. Please paste a Google Drive or Canva link instead.'
      );
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setSelectedFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
      });
    } catch {
      setFormError('Could not read the selected file. Please try another file or link.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!studentName.trim() || !gradeSection.trim()) {
      setFormError('Please enter your Learner Full Name and Grade & Section.');
      return;
    }
    if (!Number.isFinite(copies) || copies < 1 || copies > 50) {
      setFormError('Please enter how many copies of the file you need (1–50).');
      return;
    }
    if (!selectedFile && !fileLink.trim()) {
      setFormError('Please upload/attach your file OR paste a valid file link.');
      return;
    }

    const jobCode = generatePrintJobCode(portal.printJobs);
    const newJob: PrintRequestJob = {
      id: `prt-${Date.now()}`,
      jobCode,
      studentName: studentName.trim(),
      gradeSection: gradeSection.trim(),
      copies: Math.round(copies),
      colorOption,
      fileName: selectedFile?.name || 'External File Link',
      fileMimeType: selectedFile?.mimeType || 'text/url-link',
      fileSize: selectedFile?.size || 0,
      fileDataUrl: selectedFile?.dataUrl,
      fileLink: fileLink.trim() || undefined,
      notes: notes.trim() || undefined,
      status: 'Request Submitted',
      submittedAt: new Date().toISOString(),
      adminNotes: 'Queued for review at SSLG Office (Room 104).',
    };

    onSubmitPrintJob(newJob);
    setSubmittedJob(newJob);
    setTrackedJob(newJob);
    setLookupCode(newJob.jobCode);

    setStudentName('');
    setGradeSection('');
    setCopies(1);
    setSelectedFile(null);
    setFileLink('');
    setNotes('');
    onNotify(`Print request ${jobCode} submitted!`);
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupCode.trim().toLowerCase();
    if (!clean) return;
    const found = portal.printJobs.find(
      (j) =>
        j.jobCode.toLowerCase() === clean ||
        j.jobCode.toLowerCase().includes(clean) ||
        j.studentName.toLowerCase().includes(clean)
    );
    setTrackedJob(found || null);
    if (!found) {
      onNotify(`No print request found matching "${lookupCode}".`);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-yellow-300">
          Student Academic Support · SSLG Office Room 104
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight">
          Project &lsquo;Free Printing&rsquo; for all Learners
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Submit your original file (PDF, Word, PowerPoint, or Image) or file link. Both{' '}
          <strong className="text-blue-900 dark:text-[#fde047]">
            Black &amp; White and Colored Print
          </strong>{' '}
          requests are accepted.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Free Printing Request Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
              <span>Submit File for Free Printing</span>
            </h3>
            <span className="text-xs font-bold text-blue-800 dark:text-yellow-300">
              Colored Printing Accepted
            </span>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-950/60 border border-[#eab308] text-xs font-bold text-slate-950 dark:text-yellow-200">
              {formError}
            </div>
          )}

          {submittedJob && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-700 space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-blue-950 dark:text-white">
                <CheckCircle2 className="w-5 h-5 text-blue-700 dark:text-[#facc15] shrink-0" />
                <span>
                  Request Logged! Tracking Code:{' '}
                  <span className="font-mono-code text-blue-700 dark:text-[#fde047]">
                    {submittedJob.jobCode}
                  </span>
                </span>
              </div>
              <DotTimelineTracker currentStatus={submittedJob.status} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Learner Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g., Juan Dela Cruz"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  How Many Copies of File *
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={copies}
                  onChange={(e) => setCopies(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Print Color Option (Colored Accepted) *
                </label>
                <select
                  value={colorOption}
                  onChange={(e) =>
                    setColorOption(e.target.value as 'Black & White' | 'Colored Print')
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="Black & White">Black &amp; White</option>
                  <option value="Colored Print">Colored Print (Accepted)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 space-y-3">
              <div>
                <label className="block text-xs font-bold text-blue-950 dark:text-white mb-1.5">
                  Upload / Attach Original File (PDF, DOCX, PPTX, JPG, PNG)
                </label>
                <label className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border-2 border-dashed border-blue-300 dark:border-slate-600 bg-white dark:bg-slate-950 text-xs font-bold text-blue-800 dark:text-yellow-300 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-900 transition-colors">
                  <FileUp className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {selectedFile
                      ? `${selectedFile.name} (${Math.max(1, Math.round(selectedFile.size / 1024))} KB)`
                      : 'Choose File from Device (Exact format preserved)'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.ppt,.pptx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-950 dark:text-white mb-1">
                  OR Paste File Link (Google Drive / Canva Link)
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={fileLink}
                    onChange={(e) => setFileLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Purpose / Printing Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Back-to-back, Short bond paper, Research draft"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-5 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#fde047]" />
              <span>Submit Print Request &amp; Get Tracking Code</span>
            </button>
          </form>
        </div>

        {/* Dot-to-Dot Flowline Tracking Lookup */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-5">
          <div>
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
              Track Print Request (Dot Timeline)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter your <span className="font-mono-code font-bold">PRT-2026-XXX</span> code to
              follow live progress from submission to pickup.
            </p>
          </div>

          <form onSubmit={handleLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="Enter PRT-2026-101 or name"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono-code rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold cursor-pointer whitespace-nowrap"
            >
              Track Code
            </button>
          </form>

          {liveTrackedJob ? (
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono-code font-extrabold text-blue-900 dark:text-[#fde047]">
                  {liveTrackedJob.jobCode}
                </span>
                <span className="font-bold text-slate-600 dark:text-slate-300">
                  {liveTrackedJob.copies} {liveTrackedJob.copies === 1 ? 'Copy' : 'Copies'} ·{' '}
                  {liveTrackedJob.colorOption}
                </span>
              </div>

              <div>
                <p className="text-sm font-bold text-blue-950 dark:text-white">
                  {liveTrackedJob.fileName}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {liveTrackedJob.studentName} ({liveTrackedJob.gradeSection})
                </p>
              </div>

              <DotTimelineTracker currentStatus={liveTrackedJob.status} />

              <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-blue-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200">
                <strong>Office Update:</strong> {liveTrackedJob.adminNotes}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
              No matching print job found. Check your PRT code or submit a new file on the left.
            </p>
          )}

          {/* Quick Select Sample Codes */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recent Print Queue
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {portal.printJobs.slice(0, 5).map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => {
                    setLookupCode(job.jobCode);
                    setTrackedJob(job);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 flex items-center justify-between gap-2 text-xs cursor-pointer"
                >
                  <span className="font-mono-code font-bold text-blue-800 dark:text-[#fde047]">
                    {job.jobCode}
                  </span>
                  <span className="truncate flex-1 text-slate-700 dark:text-slate-200">
                    {job.fileName}
                  </span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300 shrink-0">
                    {job.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
