import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  EyeOff,
  FileSearch,
  LockKeyhole,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  generateTicketCode,
  readFileAsDataUrl,
  type GrievanceTicket,
  type PortalState,
  type TicketCategory,
} from '../../lib/portalStore.ts';

export function ReportingDeskSection({
  portal,
  onSubmitTicket,
  onNotify,
}: {
  portal: PortalState;
  onSubmitTicket: (ticket: GrievanceTicket) => void;
  onNotify: (msg: string) => void;
}) {
  const [category, setCategory] = useState<TicketCategory>('Student Welfare / Anti-Bullying');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [gradeSection, setGradeSection] = useState('');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');

  // Conditional Student Welfare / Anti-Bullying fields
  const [welfareWhatHappened, setWelfareWhatHappened] = useState('');
  const [welfareWhoDidIt, setWelfareWhoDidIt] = useState('');
  const [welfareNextAction, setWelfareNextAction] = useState('');

  // Conditional Campus Facilities photo uploads
  const [facilityPhotos, setFacilityPhotos] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<GrievanceTicket | null>(null);

  // Private Status Checker by Tracking Code
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<GrievanceTicket | null>(null);
  const [lookupAttempted, setLookupAttempted] = useState(false);

  const approvedPublicTickets = portal.tickets.filter((t) => t.approvedForPublic);

  const handleFacilityPhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const readAll = await Promise.all(
        files.slice(0, 4).map(async (f) => readFileAsDataUrl(f))
      );
      setFacilityPhotos((prev) => [...prev, ...readAll].slice(0, 4));
    } catch {
      setError('Unable to read one of the selected facility photos.');
    }
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (category === 'Student Welfare / Anti-Bullying') {
      if (!welfareWhatHappened.trim() || !welfareWhoDidIt.trim() || !welfareNextAction.trim()) {
        setError(
          'Please fill in What happened, Who did it, and What help you need so we can assist you properly.'
        );
        return;
      }
    } else if (!subject.trim() || !details.trim()) {
      setError('Please provide a subject and details for your report.');
      return;
    }

    const nowIso = new Date().toISOString();
    const ticketCode = generateTicketCode(portal.tickets);
    const derivedSubject =
      subject.trim() ||
      (category === 'Student Welfare / Anti-Bullying'
        ? 'Student Welfare / Anti-Bullying Assistance Report'
        : category);
    const derivedDetails =
      category === 'Student Welfare / Anti-Bullying'
        ? `What happened: ${welfareWhatHappened.trim()}\nWho did it: ${welfareWhoDidIt.trim()}\nNeeded action: ${welfareNextAction.trim()}`
        : details.trim();

    const created: GrievanceTicket = {
      id: `tkt-${Date.now()}`,
      ticketCode,
      category,
      isAnonymous,
      studentName: isAnonymous ? 'Anonymous' : studentName.trim() || 'Not provided',
      gradeSection: isAnonymous ? 'Undisclosed' : gradeSection.trim() || 'Not provided',
      subject: derivedSubject,
      details: derivedDetails,
      welfareWhatHappened:
        category === 'Student Welfare / Anti-Bullying' ? welfareWhatHappened.trim() : undefined,
      welfareWhoDidIt:
        category === 'Student Welfare / Anti-Bullying' ? welfareWhoDidIt.trim() : undefined,
      welfareNextAction:
        category === 'Student Welfare / Anti-Bullying' ? welfareNextAction.trim() : undefined,
      facilityPhotos: category === 'Campus Facilities' ? facilityPhotos : [],
      approvedForPublic: false,
      status: 'Pending Approval',
      submittedAt: nowIso,
      updatedAt: nowIso,
      adminResponse:
        'Received by SSLG. Pending officer review and coordination with your Grade Level Learner Formation Officer.',
    };

    onSubmitTicket(created);
    setSubmittedTicket(created);
    setLookupCode(created.ticketCode);
    setLookupResult(created);
    setLookupAttempted(true);

    setStudentName('');
    setGradeSection('');
    setSubject('');
    setDetails('');
    setWelfareWhatHappened('');
    setWelfareWhoDidIt('');
    setWelfareNextAction('');
    setFacilityPhotos([]);
    onNotify(`Report ${created.ticketCode} submitted for SSLG review.`);
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupAttempted(true);
    const clean = lookupCode.trim().toLowerCase();
    if (!clean) {
      setLookupResult(null);
      return;
    }
    const found = portal.tickets.find((t) => t.ticketCode.toLowerCase() === clean);
    setLookupResult(found || null);
  };

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-yellow-300">
          Confidential Learner Support &amp; Campus Moderation
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight">
          Grievance &amp; Welfare Reporting System
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Submit Student Welfare concerns, Campus Facility reports with photos, or policy
          suggestions. All submissions remain private until reviewed and approved by the SSLG Admin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Guided Report Submission Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
              <span>Submit New Report</span>
            </h3>

            <button
              type="button"
              role="switch"
              aria-checked={isAnonymous}
              onClick={() => setIsAnonymous((v) => !v)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                isAnonymous
                  ? 'bg-[#1e3a8a] text-[#fde047] border-blue-900'
                  : 'bg-blue-50 dark:bg-slate-800 text-blue-950 dark:text-slate-200 border-blue-200 dark:border-slate-700'
              }`}
            >
              {isAnonymous ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <LockKeyhole className="w-3.5 h-3.5" />
              )}
              <span>{isAnonymous ? 'Anonymous Option: ON' : 'Submit Anonymously'}</span>
            </button>
          </div>

          {/* Mandatory Post-Submission Confirmation Card */}
          {submittedTicket && (
            <div className="p-5 rounded-2xl bg-[#1e3a8a] text-white border-2 border-[#facc15] space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#facc15] shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#fde047]">
                      Tracking Reference Number
                    </p>
                    <p className="font-mono-code text-base font-extrabold">
                      {submittedTicket.ticketCode}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmittedTicket(null)}
                  aria-label="Dismiss notice"
                  className="text-blue-200 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-blue-50">
                Your report has been received and will be reviewed by the SSLG.{' '}
                <strong className="text-[#fde047]">
                  Please notify your class adviser while we will also coordinate with the Learner
                  Formation Officer in your grade level.
                </strong>
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-950/60 border border-[#eab308] text-xs font-bold text-slate-950 dark:text-yellow-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Report Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="Student Welfare / Anti-Bullying">
                  Student Welfare / Anti-Bullying
                </option>
                <option value="Campus Facilities">Campus Facilities (Photo Upload Enabled)</option>
                <option value="Academic / Policy Concern">Academic / Policy Concern</option>
                <option value="General Suggestion">General Suggestion</option>
              </select>
            </div>

            {!isAnonymous && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Grade &amp; Section (Optional)
                  </label>
                  <input
                    type="text"
                    value={gradeSection}
                    onChange={(e) => setGradeSection(e.target.value)}
                    placeholder="e.g., 9 - Narra"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Conditional Guided Welfare / Anti-Bullying Fields */}
            {category === 'Student Welfare / Anti-Bullying' ? (
              <div className="space-y-4 p-4 rounded-xl bg-blue-50/70 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-blue-950 dark:text-[#fde047] mb-1.5">
                    1. What happened? *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={welfareWhatHappened}
                    onChange={(e) => setWelfareWhatHappened(e.target.value)}
                    placeholder="Share clearly what happened, when, and where..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 dark:text-[#fde047] mb-1.5">
                    2. Who did it? *
                  </label>
                  <input
                    type="text"
                    required
                    value={welfareWhoDidIt}
                    onChange={(e) => setWelfareWhoDidIt(e.target.value)}
                    placeholder="Name/s, grade/section, or description of person/s involved"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 dark:text-[#fde047] mb-1.5">
                    3. What do you think should be done next / What help do you need? *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={welfareNextAction}
                    onChange={(e) => setWelfareNextAction(e.target.value)}
                    placeholder="Describe the immediate assistance or safety step you need..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Subject / Concern Headline *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your report or suggestion"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
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
                    placeholder="Include room number, building, or specific details..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </>
            )}

            {/* Conditional Campus Facilities Multi-Photo Attachment */}
            {category === 'Campus Facilities' && (
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 space-y-3">
                <label className="block text-xs font-bold text-blue-950 dark:text-white">
                  Attach Photos of Campus Facility Issue (Up to 4 photos)
                </label>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-bold cursor-pointer">
                  <Camera className="w-4 h-4 text-[#fde047]" />
                  <span>Upload Facility Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFacilityPhotosChange}
                    className="hidden"
                  />
                </label>

                {facilityPhotos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {facilityPhotos.map((src, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden border border-blue-200">
                        <img
                          src={src}
                          alt={`Facility attachment ${i + 1}`}
                          className="w-full h-20 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFacilityPhotos((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          aria-label="Remove photo"
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-950/80 text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-5 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4 text-[#fde047]" />
              <span>Submit Report for SSLG Review</span>
            </button>
          </form>
        </div>

        {/* Right Column: Private Status Checker + Public Approved Concerns Feed */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
              <span>Check Your Report Status</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your private Tracking Reference Number (e.g.{' '}
              <span className="font-mono-code font-bold">NNCHS-SSLG-2026-8412</span>).
            </p>

            <form onSubmit={handleLookup} className="flex gap-2">
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="NNCHS-SSLG-2026-XXXX"
                className="flex-1 px-3.5 py-2 text-xs font-mono-code rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold cursor-pointer whitespace-nowrap"
              >
                Check
              </button>
            </form>

            {lookupAttempted && (
              <div>
                {lookupResult ? (
                  <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-code font-extrabold text-blue-900 dark:text-[#fde047]">
                        {lookupResult.ticketCode}
                      </span>
                      <span className="font-bold text-blue-700 dark:text-blue-300">
                        {lookupResult.status}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {lookupResult.subject}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>Official Response:</strong> {lookupResult.adminResponse}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-blue-800 dark:text-yellow-300">
                    No report matched &ldquo;{lookupCode}&rdquo;. Verify your exact tracking number.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Public Approved Concerns Feed (ONLY Approved Reports) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-6 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-blue-950 dark:text-white">
                Approved Public Concerns &amp; Actions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Only campus concerns explicitly reviewed and approved by the SSLG Admin appear here.
              </p>
            </div>

            <div className="space-y-3">
              {approvedPublicTickets.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-blue-800 dark:text-[#fde047]">
                      {item.category}
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {item.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-blue-950 dark:text-white">
                    {item.subject}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.details}
                  </p>
                  {item.facilityPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {item.facilityPhotos.map((src, idx) => (
                        <img
                          key={idx}
                          src={src}
                          alt={`Approved facility photo ${idx + 1}`}
                          className="w-full h-16 object-cover rounded-lg border border-blue-200"
                        />
                      ))}
                    </div>
                  )}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                    <strong className="text-blue-900 dark:text-[#fde047]">SSLG Action:</strong>{' '}
                    {item.adminResponse}
                  </div>
                </div>
              ))}
              {approvedPublicTickets.length === 0 && (
                <p className="text-xs text-center text-slate-500 dark:text-slate-400 py-6">
                  No approved public concerns posted yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
