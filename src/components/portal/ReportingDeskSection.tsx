import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  EyeOff,
  FileSearch,
  LockKeyhole,
  Printer,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  downloadFileSafe,
  generateTicketReceiptText,
} from '../../lib/downloadEngine.ts';
import {
  generateTicketCode,
  type GrievanceTicket,
  type PortalState,
} from '../../lib/portalStore.ts';
import type { LetterheadDocumentPayload } from '../DocumentLetterheadModal.tsx';

export type ReportingSubTab = 'submit' | 'track';

export function ReportingDeskSection({
  portal,
  initialSubTab = 'submit',
  onSubmitTicket,
  onOpenLetterhead,
  onNotify,
}: {
  portal: PortalState;
  initialSubTab?: ReportingSubTab;
  onSubmitTicket: (ticket: GrievanceTicket) => void;
  onOpenLetterhead: (doc: LetterheadDocumentPayload) => void;
  onNotify: (msg: string) => void;
}) {
  const [subTab, setSubTab] = useState<ReportingSubTab>(initialSubTab);

  // Form
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [gradeSection, setGradeSection] = useState('');
  const [category, setCategory] = useState<GrievanceTicket['category']>(
    'Campus Facilities & Safety'
  );
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [receiptTicket, setReceiptTicket] = useState<GrievanceTicket | null>(null);

  // Live Status Checker
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<GrievanceTicket | null>(null);
  const [lookupSearched, setLookupSearched] = useState(false);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (!receiptTicket) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReceiptTicket(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [receiptTicket]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isAnonymous && (!studentName.trim() || !gradeSection.trim())) {
      setError('Please enter your Name and Grade & Section, or enable "Submit Anonymously".');
      return;
    }
    if (!subject.trim() || !details.trim()) {
      setError('Please provide a clear Subject and details of your concern or suggestion.');
      return;
    }

    const nowIso = new Date().toISOString();
    const ticketCode = generateTicketCode(portal.tickets);
    const created: GrievanceTicket = {
      id: `tkt-${Date.now()}`,
      ticketCode,
      isAnonymous,
      studentName: isAnonymous ? 'Anonymous Student' : studentName.trim(),
      gradeSection: isAnonymous ? 'Undisclosed' : gradeSection.trim(),
      category,
      subject: subject.trim(),
      details: details.trim(),
      status: 'Submitted',
      submittedAt: nowIso,
      updatedAt: nowIso,
      publicRemarks: 'Logged on the NNCHS SSLG Welfare Desk. Pending initial officer review (within 48 school hours).',
    };

    onSubmitTicket(created);
    setReceiptTicket(created);
    setLookupCode(created.ticketCode);
    setLookupResult(created);
    setLookupSearched(true);

    setStudentName('');
    setGradeSection('');
    setSubject('');
    setDetails('');
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupCode.trim().toLowerCase();
    setLookupSearched(true);
    if (!clean) {
      setLookupResult(null);
      return;
    }
    const found = portal.tickets.find(
      (t) => t.ticketCode.toLowerCase() === clean || t.ticketCode.toLowerCase().includes(clean)
    );
    setLookupResult(found || null);
  };

  const openReceiptLetterhead = (t: GrievanceTicket) => {
    onOpenLetterhead({
      title: `Official Grievance Tracking Receipt — ${t.ticketCode}`,
      docCode: t.ticketCode,
      categoryLabel: 'Student Welfare & Grievance Desk',
      dateLabel: new Date(t.submittedAt).toLocaleDateString('en-PH'),
      filename: `${t.ticketCode}_Receipt.txt`,
      bodyText: generateTicketReceiptText(t),
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            Confidential &amp; Zero-Login Protection
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Student Reporting, Grievance &amp; Welfare Desk
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Raise facility repairs, academic issues, anti-bullying concerns, or campus suggestions
            confidentially—with optional identity shielding.
          </p>
        </div>

        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('submit')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              subTab === 'submit'
                ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Submit New Report
          </button>
          <button
            type="button"
            onClick={() => setSubTab('track')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              subTab === 'track'
                ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Track Ticket Status
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Submit Report Card */}
        <div
          className={`lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 ${
            subTab === 'track' ? 'hidden lg:block' : ''
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span>File a Confidential Report</span>
            </h3>

            <button
              type="button"
              role="switch"
              aria-checked={isAnonymous}
              onClick={() => setIsAnonymous((v) => !v)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                isAnonymous
                  ? 'bg-slate-900 text-amber-300 border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              {isAnonymous ? <EyeOff className="w-3.5 h-3.5" /> : <LockKeyhole className="w-3.5 h-3.5" />}
              <span>{isAnonymous ? 'Anonymous Mode: ON' : 'Submit Anonymously'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-800 dark:text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isAnonymous ? (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <strong>Identity Shielded:</strong> Your name and section fields are hidden and will
                not be stored on this ticket. Keep your generated{' '}
                <span className="font-mono-code font-bold">NNCHS-SSLG-2026-XXXX</span> code to
                follow official responses.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required={!isAnonymous}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g., Maria Clara Santos"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Grade &amp; Section *
                  </label>
                  <input
                    type="text"
                    required={!isAnonymous}
                    value={gradeSection}
                    onChange={(e) => setGradeSection(e.target.value)}
                    placeholder="e.g., 10 - Gold"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Concern Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GrievanceTicket['category'])}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="Campus Facilities & Safety">Campus Facilities &amp; Safety</option>
                <option value="Student Welfare & Anti-Bullying">
                  Student Welfare &amp; Anti-Bullying
                </option>
                <option value="Academic Concern">Academic Concern</option>
                <option value="Club / Org Matter">Club / Org Matter</option>
                <option value="Policy Suggestion">Policy Suggestion</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Subject / Headline *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the concern or proposal"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Full Details &amp; Location *
              </label>
              <textarea
                rows={4}
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what happened, where on campus, and suggested action..."
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-5 rounded-xl bg-[#1e3a8a] hover:bg-[#0f172a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Submit Report &amp; Generate Tracking ID</span>
            </button>
          </form>
        </div>

        {/* Live Public Ticket Status Checker */}
        <div
          className={`lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 ${
            subTab === 'submit' ? 'lg:block' : ''
          }`}
        >
          <div>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-blue-800 dark:text-blue-400" />
              <span>Live Ticket Status Checker</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter your <span className="font-mono-code font-bold">NNCHS-SSLG-2026-XXXX</span> ID
              (try <span className="font-mono-code font-semibold">NNCHS-SSLG-2026-8412</span>).
            </p>
          </div>

          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="text"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              placeholder="NNCHS-SSLG-2026-XXXX"
              className="flex-1 px-3.5 py-2.5 text-xs font-mono-code rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              Check Status
            </button>
          </form>

          {lookupSearched && (
            <div className="pt-2">
              {lookupResult ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-code font-extrabold text-blue-800 dark:text-blue-400">
                      {lookupResult.ticketCode}
                    </span>
                    <span
                      className={`font-bold ${
                        lookupResult.status === 'Resolved'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : lookupResult.status === 'Referred to Office'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {lookupResult.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">
                    {lookupResult.subject}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300">
                    <strong>Category:</strong> {lookupResult.category} ·{' '}
                    <strong>Reporter:</strong> {lookupResult.studentName}
                  </p>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Official SSLG Remarks
                    </p>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                      {lookupResult.publicRemarks}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openReceiptLetterhead(lookupResult)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadFileSafe(
                          `${lookupResult.ticketCode}_Receipt.txt`,
                          generateTicketReceiptText(lookupResult),
                          'text/plain;charset=utf-8',
                          onNotify
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .TXT</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold">
                  No ticket found with tracking ID &ldquo;{lookupCode}&rdquo;. Verify the code or
                  pick from the recent tickets below.
                </p>
              )}
            </div>
          )}

          {/* Recent Public Sample / Quick Test Tickets */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recent Public Reference Tickets
            </p>
            <div className="space-y-1.5">
              {portal.tickets.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setLookupCode(t.ticketCode);
                    setLookupResult(t);
                    setLookupSearched(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 text-xs cursor-pointer"
                >
                  <span className="font-mono-code font-bold text-blue-800 dark:text-blue-400">
                    {t.ticketCode}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 truncate flex-1">
                    {t.subject}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                    {t.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Confirmation Modal */}
      {receiptTicket && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setReceiptTicket(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Tracking Receipt Generated"
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-300" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                    Grievance Logged Successfully
                  </p>
                  <h3 className="font-mono-code text-base font-extrabold">
                    {receiptTicket.ticketCode}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptTicket(null)}
                aria-label="Close receipt modal"
                className="p-1 text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-700 dark:text-slate-200">
              <p>
                Save or print your official tracking code{' '}
                <strong className="font-mono-code text-slate-950 dark:text-white">
                  {receiptTicket.ticketCode}
                </strong>
                . You can check officer updates anytime in the Live Ticket Status Checker.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const t = receiptTicket;
                    setReceiptTicket(null);
                    openReceiptLetterhead(t);
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>View &amp; Print PDF Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadFileSafe(
                      `${receiptTicket.ticketCode}_Receipt.txt`,
                      generateTicketReceiptText(receiptTicket),
                      'text/plain;charset=utf-8',
                      onNotify
                    )
                  }
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
