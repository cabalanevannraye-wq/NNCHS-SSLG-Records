import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Calendar as CalendarIcon,
  CalendarPlus,
  CheckCircle2,
  List,
  MapPin,
  Search,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import {
  downloadFileSafe,
  generateCalendarIcs,
} from '../../lib/downloadEngine.ts';
import type {
  CalendarEventItem,
  PortalState,
  PublicOfficer,
} from '../../lib/portalStore.ts';
import { UserAvatar } from '../SSLGCrest.tsx';

export function CalendarAndVerifierSection({
  portal,
  highlightVerifier = false,
  onNotify,
}: {
  portal: PortalState;
  highlightVerifier?: boolean;
  onNotify: (msg: string) => void;
}) {
  const [viewMode, setViewMode] = useState<'list' | 'month'>('list');
  const [categoryFilter, setCategoryFilter] = useState<'All' | CalendarEventItem['category']>('All');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);

  // Officer Digital ID Verifier
  const [verifyQuery, setVerifyQuery] = useState('NNCHS-SSLG-001');
  const [verifiedOfficer, setVerifiedOfficer] = useState<PublicOfficer | null>(
    portal.officers[0] || null
  );
  const [verifyAttempted, setVerifyAttempted] = useState(false);

  useEffect(() => {
    if (!selectedEvent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedEvent(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedEvent]);

  const filteredEvents = useMemo(() => {
    const base =
      categoryFilter === 'All'
        ? portal.calendarEvents
        : portal.calendarEvents.filter((e) => e.category === categoryFilter);
    return [...base].sort((a, b) => a.date.localeCompare(b.date));
  }, [portal.calendarEvents, categoryFilter]);

  const handleVerifyId = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyAttempted(true);
    const q = verifyQuery.trim().toLowerCase();
    if (!q) {
      setVerifiedOfficer(null);
      return;
    }
    const found = portal.officers.find(
      (o) =>
        o.digitalId.toLowerCase() === q ||
        o.fullName.toLowerCase().includes(q)
    );
    setVerifiedOfficer(found || null);
  };

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* School Activity Calendar */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
                SY {portal.schoolYear} Schedule
              </p>
              <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
                Interactive NNCHS School Activity Calendar
              </h2>
            </div>

            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Agenda</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Cards Grid</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                'All',
                'School-Wide Events',
                'Club Activities',
                'Examinations',
                'Division/District Events',
              ] as const
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-blue-900 text-white border-blue-900 dark:bg-blue-600 dark:border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div
            className={
              viewMode === 'month'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                : 'space-y-3'
            }
          >
            {filteredEvents.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setSelectedEvent(ev)}
                className="w-full text-left p-4 rounded-xl bg-slate-50 hover:bg-blue-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono-code font-bold text-blue-800 dark:text-blue-400">
                    {ev.date}
                  </span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {ev.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">{ev.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {ev.venue} · {ev.timeRange}
                  </span>
                </p>
              </button>
            ))}
            {filteredEvents.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center col-span-full">
                No scheduled activities under this category.
              </p>
            )}
          </div>
        </div>

        {/* Public Officer Digital ID Verification Tool */}
        <div
          className={`lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border p-6 space-y-5 ${
            highlightVerifier
              ? 'border-blue-600 ring-2 ring-blue-500/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Anti-Impersonation Safeguard
            </p>
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2 mt-0.5">
              <UserCheck className="w-5 h-5 text-blue-800 dark:text-blue-400" />
              <span>Officer Digital ID Verifier</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Confirm whether an official carrying an NNCHS SSLG badge is currently active for SY{' '}
              {portal.schoolYear}.
            </p>
          </div>

          <form onSubmit={handleVerifyId} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={verifyQuery}
                onChange={(e) => setVerifyQuery(e.target.value)}
                placeholder="Enter ID (e.g. NNCHS-SSLG-001) or Name"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono-code rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#0f172a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              Verify ID
            </button>
          </form>

          {verifiedOfficer ? (
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
              <div className="flex items-center gap-3">
                <UserAvatar fullName={verifiedOfficer.fullName} size="md" />
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>VERIFIED ACTIVE OFFICER</span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-950 dark:text-white truncate">
                    {verifiedOfficer.fullName}
                  </h3>
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-400">
                    {verifiedOfficer.position} · {verifiedOfficer.digitalId}
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 pt-2 border-t border-emerald-200/70 dark:border-emerald-800/60">
                <p>
                  <strong>Committee:</strong> {verifiedOfficer.committee}
                </p>
                <p>
                  <strong>Grade &amp; Section:</strong> {verifiedOfficer.gradeLevel} ·{' '}
                  {verifiedOfficer.section}
                </p>
                <p>
                  <strong>Term:</strong> {verifiedOfficer.term} ({verifiedOfficer.status})
                </p>
              </div>
            </div>
          ) : (
            verifyAttempted && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Unverified ID / Name:</strong> No officer matching &ldquo;{verifyQuery}&rdquo;
                  is listed on the active SY {portal.schoolYear} SSLG roster.
                </div>
              </div>
            )
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Quick Check Sample IDs
            </p>
            <div className="flex flex-wrap gap-1.5">
              {portal.officers.slice(0, 5).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setVerifyQuery(o.digitalId);
                    setVerifiedOfficer(o);
                    setVerifyAttempted(true);
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-mono-code text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <BadgeCheck className="w-3 h-3 inline mr-1 text-blue-700 dark:text-blue-400" />
                  {o.digitalId}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Event Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedEvent.title}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-400">
                  {selectedEvent.category} · {selectedEvent.date}
                </p>
                <h3 className="text-base font-bold">{selectedEvent.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                aria-label="Close event details"
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-700 dark:text-slate-200">
              <p>{selectedEvent.description}</p>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-xs space-y-1.5">
                <p>
                  <strong>Schedule:</strong> {selectedEvent.date} · {selectedEvent.timeRange}
                </p>
                <p>
                  <strong>Venue:</strong> {selectedEvent.venue}
                </p>
                <p>
                  <strong>Organizer:</strong> {selectedEvent.organizer}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadFileSafe(
                      `${selectedEvent.id}.ics`,
                      generateCalendarIcs(selectedEvent),
                      'text/calendar;charset=utf-8',
                      onNotify
                    )
                  }
                  className="px-4 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#0f172a] dark:bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Add to Calendar (.ICS)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
