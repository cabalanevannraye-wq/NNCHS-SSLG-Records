import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Download,
  FileText,
  Megaphone,
  MessageSquare,
  Plus,
  Printer,
  ShieldAlert,
  Smartphone,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import {
  downloadFileSafe,
  generateLedgerCsv,
  generatePrintQueueCsv,
} from '../../lib/downloadEngine.ts';
import {
  SSLG_ADMIN_SMS_NUMBER,
  buildSmsAlertPayload,
  type CalendarEventItem,
  type CampusNewsItem,
  type GrievanceTicket,
  type LedgerEntry,
  type LegislativeRecord,
  type LostFoundItem,
  type PortalState,
  type PrintJobStatus,
  type PublicClub,
  type PublicOfficer,
  type SmsDispatchLog,
  type TicketStatus,
} from '../../lib/portalStore.ts';

export type PortalAdminTabId =
  | 'portal-grievances'
  | 'portal-printing'
  | 'portal-legislation'
  | 'portal-finance'
  | 'portal-news'
  | 'portal-directory';

export function PortalAdminTabs({
  activeTab,
  portal,
  smsLogs,
  onUpdatePortal,
  onAppendSmsLog,
  onNotify,
}: {
  activeTab: PortalAdminTabId;
  portal: PortalState;
  smsLogs: SmsDispatchLog[];
  onUpdatePortal: (updater: (prev: PortalState) => PortalState) => void;
  onAppendSmsLog: (log: SmsDispatchLog) => void;
  onNotify: (msg: string) => void;
}) {
  // Ticket remarks draft map
  const [remarksDraft, setRemarksDraft] = useState<Record<string, string>>({});

  // Legislation Add Form
  const [legCode, setLegCode] = useState('');
  const [legKind, setLegKind] = useState<LegislativeRecord['docKind']>('Resolution');
  const [legTitle, setLegTitle] = useState('');
  const [legSponsor, setLegSponsor] = useState('');
  const [legSummary, setLegSummary] = useState('');
  const [legFullText, setLegFullText] = useState('');

  // Finance Add Form
  const [finVoucher, setFinVoucher] = useState('');
  const [finCommittee, setFinCommittee] = useState('Free Printing & Academic Support');
  const [finParticulars, setFinParticulars] = useState('');
  const [finType, setFinType] = useState<LedgerEntry['entryType']>('Disbursement / Expense');
  const [finAmount, setFinAmount] = useState('');
  const [finStatus, setFinStatus] = useState<LedgerEntry['liquidationStatus']>('Liquidated');

  // News + Calendar + Ticker Publisher
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCat, setNewsCat] = useState<CampusNewsItem['category']>('Advisory');
  const [newsAuthor, setNewsAuthor] = useState('Office of the SSLG Secretary & PIO');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsBody, setNewsBody] = useState('');
  const [newTicker, setNewTicker] = useState('');

  const [calTitle, setCalTitle] = useState('');
  const [calDate, setCalDate] = useState('2026-12-10');
  const [calTime, setCalTime] = useState('1:00 PM – 4:00 PM');
  const [calCat, setCalCat] = useState<CalendarEventItem['category']>('School-Wide Events');
  const [calVenue, setCalVenue] = useState('NNCHS Covered Court');
  const [calDesc, setCalDesc] = useState('');

  // Directory Add Officer / Club
  const [offName, setOffName] = useState('');
  const [offPos, setOffPos] = useState('');
  const [offCommittee, setOffCommittee] = useState('');
  const [offGrade, setOffGrade] = useState('Grade 11');
  const [offSection, setOffSection] = useState('');

  const [clubName, setClubName] = useState('');
  const [clubAcronym, setClubAcronym] = useState('');
  const [clubCategory, setClubCategory] = useState<PublicClub['category']>('Academic & Debate');
  const [clubPresident, setClubPresident] = useState('');
  const [clubAdviser, setClubAdviser] = useState('');

  const ledgerTotals = useMemo(() => {
    const income = portal.ledger
      .filter((l) => l.entryType === 'Allocation / Income')
      .reduce((acc, l) => acc + l.amount, 0);
    const expense = portal.ledger
      .filter((l) => l.entryType === 'Disbursement / Expense')
      .reduce((acc, l) => acc + l.amount, 0);
    return { income, expense, balance: income - expense };
  }, [portal.ledger]);

  const handleUpdateTicket = (ticket: GrievanceTicket, nextStatus: TicketStatus) => {
    const draft = remarksDraft[ticket.id] ?? ticket.publicRemarks;
    const wasResolved = ticket.status === 'Resolved';
    const isNowResolved = nextStatus === 'Resolved';

    onUpdatePortal((prev) => ({
      ...prev,
      impactCounters: {
        ...prev.impactCounters,
        concernsResolved:
          !wasResolved && isNowResolved
            ? prev.impactCounters.concernsResolved + 1
            : prev.impactCounters.concernsResolved,
      },
      tickets: prev.tickets.map((t) =>
        t.id === ticket.id
          ? {
              ...t,
              status: nextStatus,
              publicRemarks: draft,
              updatedAt: new Date().toISOString(),
            }
          : t
      ),
    }));
    onNotify(`Updated ${ticket.ticketCode} -> ${nextStatus}. Live public tracker synced.`);
  };

  const handleUpdatePrintJob = (jobId: string, nextStatus: PrintJobStatus) => {
    const target = portal.printJobs.find((j) => j.id === jobId);
    const shouldIncrementPages =
      target && target.status !== 'Claimed' && nextStatus === 'Claimed';

    onUpdatePortal((prev) => ({
      ...prev,
      impactCounters: {
        ...prev.impactCounters,
        freePagesPrinted: shouldIncrementPages
          ? prev.impactCounters.freePagesPrinted + target.pageCount
          : prev.impactCounters.freePagesPrinted,
      },
      printJobs: prev.printJobs.map((j) =>
        j.id === jobId ? { ...j, status: nextStatus } : j
      ),
    }));
    onNotify(`Print job updated to ${nextStatus}.`);
  };

  const handleResendSms = (jobId: string) => {
    const job = portal.printJobs.find((j) => j.id === jobId);
    if (!job) return;
    const smsLog: SmsDispatchLog = {
      id: `sms-${Date.now()}`,
      recipient: SSLG_ADMIN_SMS_NUMBER,
      jobCode: job.jobCode,
      studentName: job.studentName,
      messageBody: buildSmsAlertPayload(job),
      dispatchedAt: new Date().toISOString(),
      deliveryStatus: 'Resent by Admin',
    };
    onAppendSmsLog(smsLog);
    onNotify(`SMS reminder resent for ${job.jobCode} to ${SSLG_ADMIN_SMS_NUMBER}.`);
  };

  const handleAddLegislation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legCode.trim() || !legTitle.trim()) return;
    const newRec: LegislativeRecord = {
      id: `leg-${Date.now()}`,
      numberCode: legCode.trim(),
      docKind: legKind,
      title: legTitle.trim(),
      datePassed: new Date().toISOString().slice(0, 10),
      sponsor: legSponsor.trim() || 'SSLG Executive Committee',
      status: 'Enacted',
      summary: legSummary.trim() || legTitle.trim(),
      fullText:
        legFullText.trim() ||
        `${legKind.toUpperCase()} ${legCode.trim()}\n\nTITLE: ${legTitle.trim()}\n\n${legSummary.trim()}`,
    };
    onUpdatePortal((prev) => ({
      ...prev,
      impactCounters: {
        ...prev.impactCounters,
        resolutionsPassed: prev.impactCounters.resolutionsPassed + 1,
      },
      legislation: [newRec, ...prev.legislation],
    }));
    setLegCode('');
    setLegTitle('');
    setLegSponsor('');
    setLegSummary('');
    setLegFullText('');
    onNotify(`Published ${newRec.numberCode} to Public Transparency Seal.`);
  };

  const handleAddLedger = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(finAmount);
    if (!finVoucher.trim() || !finParticulars.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return;
    }
    const newEntry: LedgerEntry = {
      id: `led-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      voucherNo: finVoucher.trim(),
      committee: finCommittee,
      particulars: finParticulars.trim(),
      entryType: finType,
      amount: numericAmount,
      liquidationStatus: finStatus,
    };
    onUpdatePortal((prev) => ({
      ...prev,
      ledger: [newEntry, ...prev.ledger],
    }));
    setFinVoucher('');
    setFinParticulars('');
    setFinAmount('');
    onNotify(`Voucher ${newEntry.voucherNo} added to Public Financial Ledger.`);
  };

  const handlePublishNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsSummary.trim()) return;
    const item: CampusNewsItem = {
      id: `news-${Date.now()}`,
      title: newsTitle.trim(),
      category: newsCat,
      publishedAt: new Date().toISOString().slice(0, 10),
      author: newsAuthor.trim() || 'NNCHS SSLG Secretariat',
      summary: newsSummary.trim(),
      fullBody: newsBody.trim() || newsSummary.trim(),
    };
    onUpdatePortal((prev) => ({
      ...prev,
      news: [item, ...prev.news],
    }));
    setNewsTitle('');
    setNewsSummary('');
    setNewsBody('');
    onNotify(`Campus bulletin "${item.title}" published to Home page.`);
  };

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker.trim()) return;
    onUpdatePortal((prev) => ({
      ...prev,
      tickerMessages: [newTicker.trim(), ...prev.tickerMessages],
    }));
    setNewTicker('');
    onNotify('Announcement added to live scrolling campus ticker.');
  };

  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calTitle.trim() || !calDate) return;
    const ev: CalendarEventItem = {
      id: `cal-${Date.now()}`,
      title: calTitle.trim(),
      date: calDate,
      timeRange: calTime.trim() || '8:00 AM – 4:00 PM',
      category: calCat,
      venue: calVenue.trim() || 'NNCHS Campus',
      organizer: 'NNCHS SSLG Council',
      description: calDesc.trim() || calTitle.trim(),
    };
    onUpdatePortal((prev) => ({
      ...prev,
      calendarEvents: [ev, ...prev.calendarEvents],
    }));
    setCalTitle('');
    setCalDesc('');
    onNotify(`Event "${ev.title}" added to School Activity Calendar.`);
  };

  const handleAddOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offName.trim() || !offPos.trim()) return;
    const nextNum = String(portal.officers.length + 1).padStart(3, '0');
    const newOfficer: PublicOfficer = {
      id: `off-${Date.now()}`,
      digitalId: `NNCHS-SSLG-${nextNum}`,
      fullName: offName.trim(),
      position: offPos.trim(),
      committee: offCommittee.trim() || 'Standing Governance Committee',
      gradeLevel: offGrade,
      section: offSection.trim() || 'Main Campus',
      status: 'Active',
      term: `SY ${portal.schoolYear}`,
      bio: `${offPos.trim()} serving the NNCHS learner body for SY ${portal.schoolYear}.`,
      officeHours: 'Mon–Fri · Recess & Lunch Break',
      email: 'sslg@nnchs.edu.ph',
    };
    onUpdatePortal((prev) => ({
      ...prev,
      officers: [...prev.officers, newOfficer],
    }));
    setOffName('');
    setOffPos('');
    setOffCommittee('');
    setOffSection('');
    onNotify(`Registered ${newOfficer.fullName} (${newOfficer.digitalId}) in Public Directory.`);
  };

  const handleAddClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName.trim() || !clubAcronym.trim()) return;
    const newClub: PublicClub = {
      id: `club-${Date.now()}`,
      name: clubName.trim(),
      acronym: clubAcronym.trim().toUpperCase(),
      category: clubCategory,
      status: 'Accredited',
      presidentName: clubPresident.trim() || 'Student Officer',
      adviserName: clubAdviser.trim() || 'Faculty Adviser',
      memberCount: 30,
      schedule: 'Fridays · 4:00 PM–5:00 PM',
      room: 'NNCHS Main Building',
      mandate: `Accredited NNCHS learner organization under ${clubCategory}.`,
      flagshipProjects: ['SY 2026–2027 Orientation & Membership Drive'],
    };
    onUpdatePortal((prev) => ({
      ...prev,
      impactCounters: {
        ...prev.impactCounters,
        accreditedClubs: prev.clubs.length + 1,
      },
      clubs: [...prev.clubs, newClub],
    }));
    setClubName('');
    setClubAcronym('');
    setClubPresident('');
    setClubAdviser('');
    onNotify(`Added "${newClub.name}" to Public Clubs Directory.`);
  };

  const handleLostStatusChange = (item: LostFoundItem, status: LostFoundItem['status']) => {
    onUpdatePortal((prev) => ({
      ...prev,
      lostFound: prev.lostFound.map((i) => (i.id === item.id ? { ...i, status } : i)),
    }));
    onNotify(`Updated Lost & Found item ${item.itemCode} -> ${status}.`);
  };

  // TAB 1: GRIEVANCE & REPORT LOGS
  if (activeTab === 'portal-grievances') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Student Grievance &amp; Welfare Ticket Console</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Updating status or public remarks here immediately updates the Public Ticket Status
            Checker on the portal.
          </p>
        </div>

        <div className="space-y-4">
          {portal.tickets.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono-code font-extrabold text-blue-800 dark:text-blue-400">
                    {t.ticketCode}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {t.category}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {t.isAnonymous ? 'Anonymous Reporter' : `${t.studentName} (${t.gradeSection})`}
                  </span>
                </div>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {t.status}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-950 dark:text-white">{t.subject}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.details}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 items-end">
                <div className="lg:col-span-8">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Official Public Remarks (Visible on Student Status Checker)
                  </label>
                  <input
                    type="text"
                    value={remarksDraft[t.id] ?? t.publicRemarks}
                    onChange={(e) =>
                      setRemarksDraft((prev) => ({ ...prev, [t.id]: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="lg:col-span-4 flex flex-wrap gap-1.5">
                  {(['Under Review', 'Referred to Office', 'Resolved'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleUpdateTicket(t, status)}
                      className={`px-3 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                        t.status === status
                          ? 'bg-blue-900 text-white dark:bg-blue-600'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // TAB 2: FREE PRINTING & SMS LOGS QUEUE
  if (activeTab === 'portal-printing') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-800 dark:text-blue-400" />
              <span>Free Printing Queue &amp; SMS Dispatch Logs ({SSLG_ADMIN_SMS_NUMBER})</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Every student request triggers an instant SMS alert record for SSLG Admin at{' '}
              <span className="font-mono-code font-bold">{SSLG_ADMIN_SMS_NUMBER}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              downloadFileSafe(
                `NNCHS_Free_Print_Queue_${new Date().toISOString().slice(0, 10)}.csv`,
                generatePrintQueueCsv(portal.printJobs),
                'text/csv;charset=utf-8',
                onNotify
              )
            }
            className="px-4 py-2 rounded-xl bg-[#1e3a8a] hover:bg-[#0f172a] dark:bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Print Queue (.CSV)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7 space-y-3">
            {portal.printJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono-code text-xs font-extrabold text-blue-800 dark:text-blue-400">
                    {job.jobCode} · {job.pageCount}p ({job.printMode})
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {job.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                    {job.documentTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {job.studentName} ({job.gradeSection}) · {job.purpose} · Claim: {job.claimSlot}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Ref: {job.attachmentReference}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        'Pending SMS Review',
                        'Printing in Progress',
                        'Ready for Claim',
                        'Claimed',
                      ] as const
                    ).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdatePrintJob(job.id, st)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                          job.status === st
                            ? 'bg-blue-900 text-white dark:bg-blue-600'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResendSms(job.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>Log Resend SMS</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="xl:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>SMS Dispatch Audit Log ({smsLogs.length})</span>
            </h3>
            <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
              {smsLogs.map((sms) => (
                <div
                  key={sms.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between font-mono-code text-[11px]">
                    <span className="font-bold text-blue-800 dark:text-blue-400">
                      TO: {sms.recipient}
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      {sms.deliveryStatus}
                    </span>
                  </div>
                  <p className="font-mono-code text-[11px] text-slate-700 dark:text-slate-200 break-words">
                    {sms.messageBody}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(sms.dispatchedAt).toLocaleString('en-PH')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TAB 3: RESOLUTIONS & MINUTES ARCHIVE
  if (activeTab === 'portal-legislation') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-800 dark:text-blue-400" />
            <span>Publish Legislative Issuance</span>
          </h2>
          <form onSubmit={handleAddLegislation} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={legCode}
                onChange={(e) => setLegCode(e.target.value)}
                placeholder="Resolution No. 2026-07"
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
              <select
                value={legKind}
                onChange={(e) => setLegKind(e.target.value as LegislativeRecord['docKind'])}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="Resolution">Resolution</option>
                <option value="Executive Order">Executive Order</option>
                <option value="Memorandum">Memorandum</option>
              </select>
            </div>
            <input
              type="text"
              required
              value={legTitle}
              onChange={(e) => setLegTitle(e.target.value)}
              placeholder="Official Title"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={legSponsor}
              onChange={(e) => setLegSponsor(e.target.value)}
              placeholder="Sponsor / Author"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={legSummary}
              onChange={(e) => setLegSummary(e.target.value)}
              placeholder="Brief executive summary"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <textarea
              rows={4}
              value={legFullText}
              onChange={(e) => setLegFullText(e.target.value)}
              placeholder="Complete text for public download and PDF print..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#0f172a] dark:bg-blue-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publish to Transparency Archive</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 space-y-3">
          {portal.legislation.map((rec) => (
            <div
              key={rec.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-start justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <p className="font-mono-code text-xs font-bold text-blue-800 dark:text-blue-400">
                  {rec.numberCode} · {rec.docKind} · {rec.datePassed}
                </p>
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">{rec.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">{rec.summary}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdatePortal((prev) => ({
                    ...prev,
                    legislation: prev.legislation.filter((r) => r.id !== rec.id),
                  }))
                }
                aria-label={`Remove ${rec.numberCode}`}
                className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // TAB 4: FINANCIAL & LIQUIDATION LEDGER
  if (activeTab === 'portal-finance') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Allocations</p>
            <p className="text-xl font-extrabold text-slate-950 dark:text-white tabular-nums mt-1">
              PHP {ledgerTotals.income.toLocaleString('en-PH')}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Disbursements</p>
            <p className="text-xl font-extrabold text-blue-900 dark:text-blue-400 tabular-nums mt-1">
              PHP {ledgerTotals.expense.toLocaleString('en-PH')}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Available Balance</p>
              <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
                PHP {ledgerTotals.balance.toLocaleString('en-PH')}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadFileSafe(
                  `NNCHS_SSLG_Ledger_${portal.schoolYear}.csv`,
                  generateLedgerCsv(portal.ledger),
                  'text/csv;charset=utf-8',
                  onNotify
                )
              }
              className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-700" />
              <span>Record Voucher / Allocation</span>
            </h2>
            <form onSubmit={handleAddLedger} className="space-y-3">
              <input
                type="text"
                required
                value={finVoucher}
                onChange={(e) => setFinVoucher(e.target.value)}
                placeholder="Voucher No. (e.g. CV-2026-035)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
              <select
                value={finCommittee}
                onChange={(e) => setFinCommittee(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="Free Printing & Academic Support">
                  Free Printing &amp; Academic Support
                </option>
                <option value="Student Welfare & Safety">Student Welfare &amp; Safety</option>
                <option value="Environment & Green Campus">Environment &amp; Green Campus</option>
                <option value="Leadership & Club Support">Leadership &amp; Club Support</option>
                <option value="General SSLG Trust Fund">General SSLG Trust Fund</option>
              </select>
              <input
                type="text"
                required
                value={finParticulars}
                onChange={(e) => setFinParticulars(e.target.value)}
                placeholder="Itemized Particulars"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={finType}
                  onChange={(e) => setFinType(e.target.value as LedgerEntry['entryType'])}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                >
                  <option value="Disbursement / Expense">Disbursement / Expense</option>
                  <option value="Allocation / Income">Allocation / Income</option>
                </select>
                <input
                  type="number"
                  min={1}
                  required
                  value={finAmount}
                  onChange={(e) => setFinAmount(e.target.value)}
                  placeholder="Amount (PHP)"
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 tabular-nums"
                />
              </div>
              <select
                value={finStatus}
                onChange={(e) => setFinStatus(e.target.value as LedgerEntry['liquidationStatus'])}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="Liquidated">Liquidated</option>
                <option value="For Liquidation">For Liquidation</option>
                <option value="Approved Budget">Approved Budget</option>
              </select>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#0f172a] dark:bg-blue-600 text-white text-xs font-bold cursor-pointer"
              >
                Post to Transparency Ledger
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {portal.ledger.map((row) => (
                <div key={row.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0">
                    <p className="font-mono-code font-bold text-blue-800 dark:text-blue-400">
                      {row.voucherNo} · {row.date} · {row.liquidationStatus}
                    </p>
                    <p className="font-bold text-slate-950 dark:text-white truncate">
                      {row.particulars}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">{row.committee}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono-code font-extrabold text-slate-950 dark:text-white tabular-nums">
                      {row.entryType === 'Allocation / Income' ? '+' : '-'}PHP{' '}
                      {row.amount.toLocaleString('en-PH')}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdatePortal((prev) => ({
                          ...prev,
                          ledger: prev.ledger.filter((e) => e.id !== row.id),
                        }))
                      }
                      aria-label={`Delete ${row.voucherNo}`}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TAB 5: NEWS & CALENDAR PUBLISHER
  if (activeTab === 'portal-news') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-600" />
            <span>Publish Bulletin News &amp; Live Ticker</span>
          </h2>

          <form onSubmit={handleAddTicker} className="flex gap-2">
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              placeholder="Add scrolling campus advisory banner message..."
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
            >
              Add Ticker
            </button>
          </form>

          <form onSubmit={handlePublishNews} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <input
              type="text"
              required
              value={newsTitle}
              onChange={(e) => setNewsTitle(e.target.value)}
              placeholder="News Headline"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newsCat}
                onChange={(e) => setNewsCat(e.target.value as CampusNewsItem['category'])}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="Advisory">Advisory</option>
                <option value="Memorandum">Memorandum</option>
                <option value="Event Recap">Event Recap</option>
                <option value="Student Welfare">Student Welfare</option>
              </select>
              <input
                type="text"
                value={newsAuthor}
                onChange={(e) => setNewsAuthor(e.target.value)}
                placeholder="Author Office"
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
            <input
              type="text"
              required
              value={newsSummary}
              onChange={(e) => setNewsSummary(e.target.value)}
              placeholder="Short summary for Bulletin Grid"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <textarea
              rows={3}
              value={newsBody}
              onChange={(e) => setNewsBody(e.target.value)}
              placeholder="Full article text..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold cursor-pointer"
            >
              Publish Campus Bulletin
            </button>
          </form>

          <div className="space-y-2 pt-2">
            {portal.news.map((n) => (
              <div
                key={n.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-950 dark:text-white truncate">{n.title}</p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {n.category} · {n.publishedAt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePortal((prev) => ({
                      ...prev,
                      news: prev.news.filter((item) => item.id !== n.id),
                    }))
                  }
                  aria-label="Delete news bulletin"
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-800 dark:text-blue-400" />
            <span>Add School Activity Calendar Event</span>
          </h2>
          <form onSubmit={handleAddCalendarEvent} className="space-y-3">
            <input
              type="text"
              required
              value={calTitle}
              onChange={(e) => setCalTitle(e.target.value)}
              placeholder="Event Title"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                required
                value={calDate}
                onChange={(e) => setCalDate(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
              <input
                type="text"
                value={calTime}
                onChange={(e) => setCalTime(e.target.value)}
                placeholder="Time range"
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={calCat}
                onChange={(e) => setCalCat(e.target.value as CalendarEventItem['category'])}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
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
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
            <textarea
              rows={2}
              value={calDesc}
              onChange={(e) => setCalDesc(e.target.value)}
              placeholder="Event description..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold cursor-pointer"
            >
              Add to Campus Calendar
            </button>
          </form>

          <div className="space-y-2 pt-2">
            {portal.calendarEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-950 dark:text-white truncate">{ev.title}</p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {ev.date} · {ev.category} · {ev.venue}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePortal((prev) => ({
                      ...prev,
                      calendarEvents: prev.calendarEvents.filter((item) => item.id !== ev.id),
                    }))
                  }
                  aria-label="Delete calendar event"
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
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

  // TAB 6: DIRECTORY & ID MANAGER
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-800 dark:text-blue-400" />
            <span>Register Officer &amp; Issue Digital ID</span>
          </h2>
          <form onSubmit={handleAddOfficer} className="space-y-3">
            <input
              type="text"
              required
              value={offName}
              onChange={(e) => setOffName(e.target.value)}
              placeholder="Officer Full Name"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={offPos}
                onChange={(e) => setOffPos(e.target.value)}
                placeholder="Official Position"
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
              <input
                type="text"
                value={offCommittee}
                onChange={(e) => setOffCommittee(e.target.value)}
                placeholder="Committee Name"
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={offGrade}
                onChange={(e) => setOffGrade(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={offSection}
                onChange={(e) => setOffSection(e.target.value)}
                placeholder="Section (e.g. STEM A)"
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold cursor-pointer"
            >
              Add Officer to Public Roster &amp; ID Verifier
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
            Recognize Campus Club / Organization
          </h2>
          <form onSubmit={handleAddClub} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Official Club Name"
                className="col-span-2 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
              <input
                type="text"
                required
                value={clubAcronym}
                onChange={(e) => setClubAcronym(e.target.value)}
                placeholder="Acronym"
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
            <select
              value={clubCategory}
              onChange={(e) => setClubCategory(e.target.value as PublicClub['category'])}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="Campus Press">Campus Press</option>
              <option value="STEM & Research">STEM &amp; Research</option>
              <option value="Arts & Culture">Arts &amp; Culture</option>
              <option value="Sports & Athletics">Sports &amp; Athletics</option>
              <option value="Civic & Environmental">Civic &amp; Environmental</option>
              <option value="Religious & Values">Religious &amp; Values</option>
              <option value="Academic & Debate">Academic &amp; Debate</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={clubPresident}
                onChange={(e) => setClubPresident(e.target.value)}
                placeholder="Club President"
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
              <input
                type="text"
                value={clubAdviser}
                onChange={(e) => setClubAdviser(e.target.value)}
                placeholder="Faculty Adviser"
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold cursor-pointer"
            >
              Add Club to Public Directory
            </button>
          </form>
        </div>
      </div>

      {/* Lost & Found Custody Manager */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
          Lost &amp; Found Custody Board Manager ({portal.lostFound.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {portal.lostFound.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <p className="font-mono-code font-bold text-blue-800 dark:text-blue-400">
                  {item.itemCode} · {item.status}
                </p>
                <p className="font-bold text-slate-950 dark:text-white truncate">{item.itemName}</p>
                <p className="text-slate-500 dark:text-slate-400 truncate">{item.location}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleLostStatusChange(item, 'In SSLG Custody')}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  Custody
                </button>
                <button
                  type="button"
                  onClick={() => handleLostStatusChange(item, 'Claimed')}
                  className="px-2 py-1 rounded bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Claimed
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
