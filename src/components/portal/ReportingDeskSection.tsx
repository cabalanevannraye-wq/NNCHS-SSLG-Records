import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileSearch,
  FileUp,
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
  type TicketEvidenceFile,
} from '../../lib/portalStore.ts';

const BULLYING_TYPE_OPTIONS: Array<{ id: string; label: string; description: string }> = [
  { id: 'Physical', label: 'Physical', description: 'Hitting, pushing, property damage' },
  { id: 'Verbal', label: 'Verbal', description: 'Name-calling, teasing, insults, threats' },
  {
    id: 'Social / Relational',
    label: 'Social / Relational',
    description: 'Exclusion, spreading rumors, public embarrassment',
  },
  {
    id: 'Cyberbullying',
    label: 'Cyberbullying',
    description: 'Harassment via Messenger, Facebook, group chats, or other social media',
  },
  {
    id: 'Gender-Based / Discriminatory',
    label: 'Gender-Based / Discriminatory',
    description: 'Comments/actions targeting appearance, race, or gender identity',
  },
];

const SUPPORT_PREFERENCE_OPTIONS = [
  'One-on-one session with the Guidance Counselor',
  'Mediation or intervention by school authorities',
  'Safety escort or schedule adjustment',
  'Just logging the incident for documentation',
] as const;

export function ReportingDeskSection({
  portal,
  onSubmitTicket,
  onNotify,
}: {
  portal: PortalState;
  onSubmitTicket: (ticket: GrievanceTicket) => void;
  onNotify: (msg: string) => void;
}) {
  const [category, setCategory] = useState<TicketCategory>('Bullying / Learner Welfare');

  // Section 1: Reporter Information & Confidentiality (for Bullying / Learner Welfare)
  const [reportingRole, setReportingRole] = useState<
    NonNullable<GrievanceTicket['reportingRole']>
  >('Self (Target/Victim)');
  const [anonymityPreference, setAnonymityPreference] = useState<
    NonNullable<GrievanceTicket['anonymityPreference']>
  >('Confidential (Known only to the Guidance Counselor/Welfare Officer)');
  const [preferredContactMethod, setPreferredContactMethod] = useState<
    NonNullable<GrievanceTicket['preferredContactMethod']>
  >('In-Person via Guidance Office');
  const [contactValue, setContactValue] = useState('');

  // Standard / Shared Reporter Identity
  const [generalAnonymous, setGeneralAnonymous] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [gradeSection, setGradeSection] = useState('');

  // Section 2: Incident Classification (Bullying / Learner Welfare)
  const [bullyingTypes, setBullyingTypes] = useState<string[]>([]);
  const [incidentFrequency, setIncidentFrequency] = useState<
    NonNullable<GrievanceTicket['incidentFrequency']>
  >('First time');

  // Section 3: Incident Details & Documentation (Bullying / Learner Welfare)
  const [incidentDateTime, setIncidentDateTime] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [personsInvolved, setPersonsInvolved] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [narrativeDescription, setNarrativeDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<TicketEvidenceFile[]>([]);
  const [evidenceLink, setEvidenceLink] = useState('');

  // Section 4: Immediate Safety & Support Needs (Bullying / Learner Welfare)
  const [immediateSafetyCheck, setImmediateSafetyCheck] = useState<
    NonNullable<GrievanceTicket['immediateSafetyCheck']>
  >('No, I am currently safe');
  const [previouslyReported, setPreviouslyReported] = useState(false);
  const [previousReportDetails, setPreviousReportDetails] = useState('');
  const [supportPreferences, setSupportPreferences] = useState<string[]>([]);

  // Standard category inputs (Facilities, Academic/Policy, General Suggestion)
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [facilityPhotos, setFacilityPhotos] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<GrievanceTicket | null>(null);

  // Private Status Checker by Tracking Code
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<GrievanceTicket | null>(null);
  const [lookupAttempted, setLookupAttempted] = useState(false);

  const approvedPublicTickets = portal.tickets.filter((t) => t.approvedForPublic);
  const isStrictlyAnonymous =
    category === 'Bullying / Learner Welfare'
      ? anonymityPreference === 'Strictly Anonymous (No contact details provided)'
      : generalAnonymous;

  const toggleSelection = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setList((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const handleEvidenceFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const readAll = await Promise.all(
        files.slice(0, 4).map(async (f) => ({
          name: f.name,
          mimeType: f.type || 'application/octet-stream',
          dataUrl: await readFileAsDataUrl(f),
        }))
      );
      setEvidenceFiles((prev) => [...prev, ...readAll].slice(0, 4));
    } catch {
      setError('Unable to read one of the selected evidence files.');
    }
    e.target.value = '';
  };

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

    if (category === 'Bullying / Learner Welfare') {
      if (bullyingTypes.length === 0) {
        setError('Please select at least one Incident Classification type in Section 2.');
        return;
      }
      if (!incidentDateTime.trim() || !incidentLocation.trim() || !personsInvolved.trim() || !narrativeDescription.trim()) {
        setError(
          'Please fill in the Date & Time, Location, Persons Involved, and Detailed Narrative in Section 3.'
        );
        return;
      }
    } else if (!subject.trim() || !details.trim()) {
      setError('Please provide a subject and details for your report.');
      return;
    }

    const nowIso = new Date().toISOString();
    const ticketCode = generateTicketCode(portal.tickets);

    if (category === 'Bullying / Learner Welfare') {
      const derivedSubject = `${bullyingTypes.join(', ')} Concern (${incidentFrequency})`;
      const derivedDetails = [
        `Role: ${reportingRole}`,
        `Location: ${incidentLocation.trim()} (${incidentDateTime.trim()})`,
        `Persons Involved: ${personsInvolved.trim()}`,
        witnesses.trim() ? `Witnesses: ${witnesses.trim()}` : null,
        `Narrative: ${narrativeDescription.trim()}`,
        `Immediate Safety: ${immediateSafetyCheck}`,
        supportPreferences.length > 0 ? `Requested Support: ${supportPreferences.join('; ')}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const created: GrievanceTicket = {
        id: `tkt-${Date.now()}`,
        ticketCode,
        category,
        isAnonymous: isStrictlyAnonymous,
        studentName: isStrictlyAnonymous ? 'Strictly Anonymous' : studentName.trim() || 'Undisclosed',
        gradeSection: isStrictlyAnonymous ? 'Undisclosed' : gradeSection.trim() || 'Undisclosed',
        subject: derivedSubject,
        details: derivedDetails,
        reportingRole,
        anonymityPreference,
        preferredContactMethod: isStrictlyAnonymous ? undefined : preferredContactMethod,
        contactValue: isStrictlyAnonymous ? undefined : contactValue.trim() || undefined,
        bullyingTypes,
        incidentFrequency,
        incidentDateTime: incidentDateTime.trim(),
        incidentLocation: incidentLocation.trim(),
        personsInvolved: personsInvolved.trim(),
        witnesses: witnesses.trim() || undefined,
        narrativeDescription: narrativeDescription.trim(),
        evidenceFiles,
        evidenceLink: evidenceLink.trim() || undefined,
        immediateSafetyCheck,
        previouslyReported,
        previousReportDetails: previouslyReported ? previousReportDetails.trim() || undefined : undefined,
        supportPreferences,
        facilityPhotos: [],
        approvedForPublic: false,
        status: 'Pending Approval',
        submittedAt: nowIso,
        updatedAt: nowIso,
        adminResponse:
          immediateSafetyCheck === 'Yes, immediate intervention is needed'
            ? 'URGENT WELFARE ALERT RECEIVED: Flagged for immediate coordination with Guidance Office and Grade Level Learner Formation Officer.'
            : 'Received by NNCHS-SSLG Welfare Desk. Pending confidential review and coordination with your Grade Level Learner Formation Officer.',
      };

      onSubmitTicket(created);
      setSubmittedTicket(created);
      setLookupCode(created.ticketCode);
      setLookupResult(created);
      setLookupAttempted(true);

      setStudentName('');
      setGradeSection('');
      setContactValue('');
      setBullyingTypes([]);
      setIncidentDateTime('');
      setIncidentLocation('');
      setPersonsInvolved('');
      setWitnesses('');
      setNarrativeDescription('');
      setEvidenceFiles([]);
      setEvidenceLink('');
      setPreviouslyReported(false);
      setPreviousReportDetails('');
      setSupportPreferences([]);
      onNotify(`Confidential report ${created.ticketCode} submitted for SSLG review.`);
      return;
    }

    const created: GrievanceTicket = {
      id: `tkt-${Date.now()}`,
      ticketCode,
      category,
      isAnonymous: isStrictlyAnonymous,
      studentName: isStrictlyAnonymous ? 'Anonymous' : studentName.trim() || 'Not provided',
      gradeSection: isStrictlyAnonymous ? 'Undisclosed' : gradeSection.trim() || 'Not provided',
      subject: subject.trim(),
      details: details.trim(),
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
          Submit Bullying / Learner Welfare reports, Campus Facility issues with photos, or academic suggestions. All reports remain private unless expressly reviewed and approved by the SSLG Admin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Guided Report Submission Form */}
        <div className="lg:col-span-7 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-extrabold uppercase tracking-wide text-blue-950 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
              <span>SUBMIT NEW REPORT</span>
            </h3>

            {category !== 'Bullying / Learner Welfare' && (
              <button
                type="button"
                role="switch"
                aria-checked={generalAnonymous}
                onClick={() => setGeneralAnonymous((v) => !v)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                  generalAnonymous
                    ? 'bg-[#1e3a8a] text-[#fde047] border-blue-900'
                    : 'bg-blue-50 dark:bg-slate-800 text-blue-950 dark:text-slate-200 border-blue-200 dark:border-slate-700'
                }`}
              >
                <LockKeyhole className="w-3.5 h-3.5" />
                <span>{generalAnonymous ? 'Anonymous Option: ON' : 'Submit Anonymously'}</span>
              </button>
            )}
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
                  Please notify your adviser while we will also coordinate to the Learner Formation
                  Officer in your grade level.
                </strong>
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-950/60 border border-[#eab308] text-xs font-bold text-slate-950 dark:text-yellow-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Report Category *
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setError('');
                  setCategory(e.target.value as TicketCategory);
                }}
                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="Bullying / Learner Welfare">
                  Bullying / Learner Welfare (4-Section Confidential Intake)
                </option>
                <option value="Campus Facilities">Campus Facilities (Photo Upload Enabled)</option>
                <option value="Academic / Policy Concern">Academic / Policy Concern</option>
                <option value="General Suggestion">General Suggestion</option>
              </select>
            </div>

            {category === 'Bullying / Learner Welfare' ? (
              <div className="space-y-5">
                {/* SECTION 1: Reporter Information & Confidentiality */}
                <div className="p-4 sm:p-5 rounded-xl bg-blue-50/75 dark:bg-slate-800/75 border border-blue-200 dark:border-slate-700 space-y-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-[#fde047]">
                      Section 1 of 4
                    </p>
                    <h4 className="text-sm font-extrabold text-blue-950 dark:text-white">
                      Reporter Information &amp; Confidentiality
                    </h4>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Are you reporting as: *
                    </label>
                    <select
                      value={reportingRole}
                      onChange={(e) =>
                        setReportingRole(
                          e.target.value as NonNullable<GrievanceTicket['reportingRole']>
                        )
                      }
                      className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    >
                      <option value="Self (Target/Victim)">Self (Target/Victim)</option>
                      <option value="Witness">Witness</option>
                      <option value="Concerned Peer">Concerned Peer</option>
                      <option value="Parent or Guardian">Parent or Guardian</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Anonymity Preference *
                    </label>
                    <div className="space-y-2">
                      {(
                        [
                          'Full Disclosure (Open for direct follow-up)',
                          'Confidential (Known only to the Guidance Counselor/Welfare Officer)',
                          'Strictly Anonymous (No contact details provided)',
                        ] as const
                      ).map((opt) => (
                        <label
                          key={opt}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-blue-100 dark:border-slate-700 text-xs cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="anonymityPreference"
                            checked={anonymityPreference === opt}
                            onChange={() => setAnonymityPreference(opt)}
                            className="mt-0.5 accent-[#1e3a8a]"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {opt}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {!isStrictlyAnonymous && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Reporter Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="Full name"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Grade &amp; Section (Optional)
                        </label>
                        <input
                          type="text"
                          value={gradeSection}
                          onChange={(e) => setGradeSection(e.target.value)}
                          placeholder="e.g., Grade 9 - Narra"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Preferred Contact Method
                        </label>
                        <select
                          value={preferredContactMethod}
                          onChange={(e) =>
                            setPreferredContactMethod(
                              e.target.value as NonNullable<GrievanceTicket['preferredContactMethod']>
                            )
                          }
                          className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                        >
                          <option value="In-Person via Guidance Office">
                            In-Person via Guidance Office
                          </option>
                          <option value="Email">Email</option>
                          <option value="Messenger">Messenger</option>
                        </select>
                      </div>
                      {preferredContactMethod !== 'In-Person via Guidance Office' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                            {preferredContactMethod === 'Email'
                              ? 'Email Address'
                              : 'Messenger Profile / Name'}
                          </label>
                          <input
                            type="text"
                            value={contactValue}
                            onChange={(e) => setContactValue(e.target.value)}
                            placeholder={
                              preferredContactMethod === 'Email'
                                ? 'learner@example.com'
                                : 'Facebook / Messenger link or handle'
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SECTION 2: Incident Classification */}
                <div className="p-4 sm:p-5 rounded-xl bg-blue-50/75 dark:bg-slate-800/75 border border-blue-200 dark:border-slate-700 space-y-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-[#fde047]">
                      Section 2 of 4
                    </p>
                    <h4 className="text-sm font-extrabold text-blue-950 dark:text-white">
                      Incident Classification
                    </h4>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                      Type(s) of Bullying / Concern (Select all that apply) *
                    </label>
                    <div className="space-y-2">
                      {BULLYING_TYPE_OPTIONS.map((opt) => {
                        const checked = bullyingTypes.includes(opt.id);
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'bg-[#1e3a8a]/10 dark:bg-blue-900/40 border-[#1e3a8a] dark:border-[#fde047]'
                                : 'bg-white dark:bg-slate-950 border-blue-100 dark:border-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleSelection(bullyingTypes, setBullyingTypes, opt.id)
                              }
                              className="mt-0.5 accent-[#1e3a8a]"
                            />
                            <div>
                              <span className="font-extrabold text-blue-950 dark:text-white">
                                {opt.label}:{' '}
                              </span>
                              <span className="text-slate-600 dark:text-slate-300">
                                {opt.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Incident Frequency *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          'First time',
                          'Happened 2–3 times',
                          'Ongoing (Weekly or Daily)',
                        ] as const
                      ).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setIncidentFrequency(freq)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                            incidentFrequency === freq
                              ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                              : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-blue-200 dark:border-slate-700'
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Incident Details & Documentation */}
                <div className="p-4 sm:p-5 rounded-xl bg-blue-50/75 dark:bg-slate-800/75 border border-blue-200 dark:border-slate-700 space-y-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-[#fde047]">
                      Section 3 of 4
                    </p>
                    <h4 className="text-sm font-extrabold text-blue-950 dark:text-white">
                      Incident Details &amp; Documentation
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Date &amp; Time of Incident *
                      </label>
                      <input
                        type="text"
                        required
                        value={incidentDateTime}
                        onChange={(e) => setIncidentDateTime(e.target.value)}
                        placeholder="e.g., Nov 22, 2026 around 12:30 PM"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Specific Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={incidentLocation}
                        onChange={(e) => setIncidentLocation(e.target.value)}
                        placeholder="e.g., Classroom, Quadrangle, Online/Messenger"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Persons Involved (Names/Grade/Description) *
                      </label>
                      <input
                        type="text"
                        required
                        value={personsInvolved}
                        onChange={(e) => setPersonsInvolved(e.target.value)}
                        placeholder="Name/s, grade/section, or description"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Witnesses (Optional)
                      </label>
                      <input
                        type="text"
                        value={witnesses}
                        onChange={(e) => setWitnesses(e.target.value)}
                        placeholder="Classmates or staff present"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Detailed Narrative *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={narrativeDescription}
                      onChange={(e) => setNarrativeDescription(e.target.value)}
                      placeholder="Describe clearly what happened..."
                      className="w-full px-3 py-2.5 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Evidence Upload (Screenshots, PDFs, Docs — max 4)
                      </label>
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-bold cursor-pointer">
                        <FileUp className="w-3.5 h-3.5 text-[#fde047]" />
                        <span>Attach Evidence ({evidenceFiles.length}/4)</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          multiple
                          onChange={handleEvidenceFilesChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                        Or Paste Evidence Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={evidenceLink}
                        onChange={(e) => setEvidenceLink(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {evidenceFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {evidenceFiles.map((file, i) => (
                        <span
                          key={`${file.name}-${i}`}
                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-blue-200 dark:border-slate-700 text-[11px] font-semibold"
                        >
                          <span className="truncate max-w-[160px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setEvidenceFiles((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            aria-label={`Remove ${file.name}`}
                            className="text-slate-500 hover:text-blue-950 dark:hover:text-[#fde047] cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION 4: Immediate Safety & Support Needs */}
                <div className="p-4 sm:p-5 rounded-xl bg-blue-50/75 dark:bg-slate-800/75 border border-blue-200 dark:border-slate-700 space-y-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-[#fde047]">
                      Section 4 of 4
                    </p>
                    <h4 className="text-sm font-extrabold text-blue-950 dark:text-white">
                      Immediate Safety &amp; Support Needs
                    </h4>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                      Immediate Safety Check *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          'Yes, immediate intervention is needed',
                          'No, I am currently safe',
                          'Unsure',
                        ] as const
                      ).map((safetyOpt) => {
                        const selected = immediateSafetyCheck === safetyOpt;
                        const isUrgent = safetyOpt === 'Yes, immediate intervention is needed';
                        return (
                          <button
                            key={safetyOpt}
                            type="button"
                            onClick={() => setImmediateSafetyCheck(safetyOpt)}
                            className={`py-2.5 px-3 rounded-lg text-xs font-bold border text-left cursor-pointer transition-colors flex items-start gap-1.5 ${
                              selected
                                ? isUrgent
                                  ? 'bg-[#facc15] text-slate-950 border-[#eab308]'
                                  : 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                                : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-blue-200 dark:border-slate-700'
                            }`}
                          >
                            {isUrgent && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                            <span>{safetyOpt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={previouslyReported}
                        onChange={(e) => setPreviouslyReported(e.target.checked)}
                        className="accent-[#1e3a8a]"
                      />
                      <span>Previously reported to a teacher, adviser, or officer</span>
                    </label>
                    {previouslyReported && (
                      <input
                        type="text"
                        value={previousReportDetails}
                        onChange={(e) => setPreviousReportDetails(e.target.value)}
                        placeholder="Who did you report to and when?"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                      Preferred Support / Desired Action
                    </label>
                    <div className="space-y-2">
                      {SUPPORT_PREFERENCE_OPTIONS.map((opt) => {
                        const checked = supportPreferences.includes(opt);
                        return (
                          <label
                            key={opt}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-blue-100 dark:border-slate-700 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleSelection(supportPreferences, setSupportPreferences, opt)
                              }
                              className="mt-0.5 accent-[#1e3a8a]"
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {opt}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {!generalAnonymous && (
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

            {/* Mandatory Data Privacy & Child Protection Notice */}
            <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-slate-950/80 border border-blue-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              <p className="font-extrabold text-blue-950 dark:text-[#fde047] mb-1">
                Data Privacy &amp; Child Protection Notice
              </p>
              <p>
                Data Privacy &amp; Child Protection Notice: All information submitted through this
                portal is strictly confidential and protected under the Data Privacy Act of 2012 (RA
                10173), the Anti-Bullying Act of 2013 (RA 10627), and the DepEd Child Protection
                Policy (DepEd Order No. 40, s. 2012). Access to this report is restricted solely to
                authorized school welfare personnel.
              </p>
            </div>
          </form>
        </div>

        {/* Right Column: Private Status Checker + Public Approved Concerns Feed */}
        <div className="lg:col-span-5 space-y-6">
          <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 space-y-4">
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
          <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 space-y-4">
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
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
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
