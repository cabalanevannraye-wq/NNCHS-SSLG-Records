import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  Camera,
  MapPin,
  PackageSearch,
  Search,
  X,
} from 'lucide-react';
import {
  downloadTextFile,
  generateCalendarIcs,
} from '../../lib/downloadEngine.ts';
import {
  readFileAsDataUrl,
  type CalendarEventItem,
  type LostFoundItem,
  type PortalProgram,
  type PortalState,
} from '../../lib/portalStore.ts';

function GlassProgramCard({ program }: { program: PortalProgram }) {
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    if (program.photos.length <= 1) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      setPhotoIdx((prev) => (prev + 1) % program.photos.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [program.photos.length]);

  const currentPhoto = program.photos[photoIdx] || program.photos[0];

  return (
    <article className="backdrop-blur-md bg-white/75 dark:bg-slate-800/75 border border-blue-200/70 dark:border-blue-700/60 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition-all duration-300">
      {currentPhoto && (
        <div className="relative h-48 overflow-hidden bg-[#0f172a]">
          <img
            key={currentPhoto}
            src={currentPhoto}
            alt={program.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover animate-sslg-fade"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/70 via-transparent to-transparent"
          />
          {program.photos.length > 1 && (
            <div className="absolute bottom-2.5 right-3 flex gap-1.5">
              {program.photos.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Photo ${idx + 1}`}
                  onClick={() => setPhotoIdx(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === photoIdx ? 'w-5 bg-[#facc15]' : 'w-2 bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
            <span className="text-blue-700 dark:text-[#fde047]">{program.category}</span>
            <span className="text-slate-500 dark:text-slate-300">{program.status}</span>
          </div>
          <h3 className="text-base font-extrabold text-blue-950 dark:text-white leading-snug">
            {program.title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {program.summary}
          </p>
        </div>

        <div className="pt-3 border-t border-blue-100/70 dark:border-slate-700/80 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span>{program.venue}</span>
          <span className="font-mono-code text-blue-800 dark:text-yellow-300">
            {program.targetDate}
          </span>
        </div>
      </div>
    </article>
  );
}

export function ProgramsCalendarSection({
  portal,
  onSubmitLostFound,
  onNotify,
}: {
  portal: PortalState;
  onSubmitLostFound: (item: LostFoundItem) => void;
  onNotify: (msg: string) => void;
}) {
  const [programFilter, setProgramFilter] = useState<'All' | PortalProgram['status']>('All');
  const [calendarFilter, setCalendarFilter] = useState<'All' | CalendarEventItem['category']>(
    'All'
  );
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);

  // Lost & Found form
  const [lfSearch, setLfSearch] = useState('');
  const [lfType, setLfType] = useState<'Lost' | 'Found'>('Lost');
  const [lfItemName, setLfItemName] = useState('');
  const [lfOwnerName, setLfOwnerName] = useState('');
  const [lfLastSeen, setLfLastSeen] = useState('');
  const [lfDetails, setLfDetails] = useState('');
  const [lfContact, setLfContact] = useState('');
  const [lfPhotoUrl, setLfPhotoUrl] = useState('');
  const [lfPostedCode, setLfPostedCode] = useState('');

  useEffect(() => {
    if (!selectedEvent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedEvent(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedEvent]);

  const filteredPrograms = useMemo(() => {
    if (programFilter === 'All') return portal.programs;
    return portal.programs.filter((p) => p.status === programFilter);
  }, [portal.programs, programFilter]);

  const filteredLostFound = useMemo(() => {
    const q = lfSearch.trim().toLowerCase();
    if (!q) return portal.lostFound;
    return portal.lostFound.filter(
      (i) =>
        i.itemName.toLowerCase().includes(q) ||
        i.ownerName.toLowerCase().includes(q) ||
        i.lastSeen.toLowerCase().includes(q) ||
        i.details.toLowerCase().includes(q)
    );
  }, [portal.lostFound, lfSearch]);

  const filteredCalendar = useMemo(() => {
    const list =
      calendarFilter === 'All'
        ? portal.calendarEvents
        : portal.calendarEvents.filter((e) => e.category === calendarFilter);
    return [...list].sort((a, b) => a.date.localeCompare(b.date));
  }, [portal.calendarEvents, calendarFilter]);

  const handleLostPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setLfPhotoUrl(dataUrl);
    } catch {
      onNotify('Unable to load item photo.');
    }
  };

  const handleSubmitLostFound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lfItemName.trim() || !lfLastSeen.trim() || !lfContact.trim()) return;
    const itemCode = `LF-2026-${Math.floor(10 + Math.random() * 89)}`;
    const newItem: LostFoundItem = {
      id: `lf-${Date.now()}`,
      itemCode,
      type: lfType,
      itemName: lfItemName.trim(),
      ownerName: lfOwnerName.trim() || 'Not specified',
      lastSeen: lfLastSeen.trim(),
      details: lfDetails.trim() || 'Posted via NNCHS SSLG Lost & Found Board.',
      contactInfo: lfContact.trim(),
      photoUrl: lfPhotoUrl || undefined,
      status: 'Open',
    };
    onSubmitLostFound(newItem);
    setLfPostedCode(itemCode);
    setLfItemName('');
    setLfOwnerName('');
    setLfLastSeen('');
    setLfDetails('');
    setLfContact('');
    setLfPhotoUrl('');
    onNotify(`Lost & Found entry ${itemCode} published.`);
  };

  return (
    <section className="space-y-12">
      {/* 1. GLASSY FADE-MODE PROGRAMS SHOWCASE */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-blue-50 via-white to-yellow-50/70 dark:from-slate-900 dark:via-[#0f172a] dark:to-blue-950/60 border border-blue-100 dark:border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-[#fde047]">
              Flagship Learner Initiatives
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight">
              Programs &amp; Initiatives Showcase
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Ongoing', 'Upcoming', 'Completed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setProgramFilter(status)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  programFilter === status
                    ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-blue-200 dark:border-slate-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div
          key={programFilter}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-sslg-fade"
        >
          {filteredPrograms.map((prog) => (
            <GlassProgramCard key={prog.id} program={prog} />
          ))}
        </div>
      </div>

      {/* 2. NNCHS LOST & FOUND BOARD */}
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-[#fde047]">
            Campus Property Desk · Room 104
          </p>
          <h2 className="text-2xl font-extrabold text-blue-950 dark:text-white tracking-tight">
            NNCHS Lost &amp; Found Board
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Board Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={lfSearch}
                onChange={(e) => setLfSearch(e.target.value)}
                placeholder="Search item name, owner, location, or details..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredLostFound.map((item) => (
                <article
                  key={item.id}
                  className="backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  {item.photoUrl && (
                    <img
                      src={item.photoUrl}
                      alt={item.itemName}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-4 space-y-2 text-xs flex-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="font-mono-code text-blue-800 dark:text-[#fde047]">
                        {item.itemCode} · {item.type}
                      </span>
                      <span className="text-slate-500 dark:text-slate-300">{item.status}</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-blue-950 dark:text-white">
                      {item.itemName}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>Owner:</strong> {item.ownerName}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>Last Seen:</strong> {item.lastSeen}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>Details:</strong> {item.details}
                    </p>
                    <p className="pt-1 font-bold text-blue-800 dark:text-yellow-300">
                      Contact: {item.contactInfo}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Public Submission Form */}
          <div className="lg:col-span-5 backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <PackageSearch className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
              <span>Post Lost or Found Item</span>
            </h3>

            {lfPostedCode && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-900 dark:text-[#fde047]">
                Posted to Lost &amp; Found Board ({lfPostedCode}).
              </div>
            )}

            <form onSubmit={handleSubmitLostFound} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Post Type
                  </label>
                  <select
                    value={lfType}
                    onChange={(e) => setLfType(e.target.value as 'Lost' | 'Found')}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Lost">Lost Item</option>
                    <option value="Found">Found Item</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Owner (if known)
                  </label>
                  <input
                    type="text"
                    value={lfOwnerName}
                    onChange={(e) => setLfOwnerName(e.target.value)}
                    placeholder="Owner name or Unknown"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={lfItemName}
                  onChange={(e) => setLfItemName(e.target.value)}
                  placeholder="e.g., Scientific Calculator / ID Lace"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Last Seen (Location &amp; Date) *
                </label>
                <input
                  type="text"
                  required
                  value={lfLastSeen}
                  onChange={(e) => setLfLastSeen(e.target.value)}
                  placeholder="e.g., Covered Court · Today 12:30 PM"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Details of the Item *
                </label>
                <textarea
                  rows={2}
                  required
                  value={lfDetails}
                  onChange={(e) => setLfDetails(e.target.value)}
                  placeholder="Color, brand, stickers, or identifying marks..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Contact Number / Messenger *
                </label>
                <input
                  type="text"
                  required
                  value={lfContact}
                  onChange={(e) => setLfContact(e.target.value)}
                  placeholder="Messenger name or contact info"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Attach Photo
                </label>
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-900 dark:text-[#fde047] text-xs font-bold cursor-pointer border border-blue-200 dark:border-slate-600">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{lfPhotoUrl ? 'Photo Attached (Replace)' : 'Choose Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLostPhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-extrabold cursor-pointer"
              >
                Publish to Lost &amp; Found Board
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 3. SSLG ACTIVITY CALENDAR */}
      <div className="backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-[#fde047]">
              SY {portal.schoolYear} Schedule
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-blue-950 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-700 dark:text-[#fde047]" />
              <span>SSLG Activity Calendar</span>
            </h2>
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
                onClick={() => setCalendarFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  calendarFilter === cat
                    ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-blue-200 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredCalendar.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setSelectedEvent(ev)}
              className="text-left p-4 rounded-xl bg-blue-50/50 hover:bg-blue-100/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-blue-100 dark:border-slate-700 transition-colors cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono-code font-bold text-blue-800 dark:text-[#fde047]">
                  {ev.date}
                </span>
                <span className="font-semibold text-slate-500 dark:text-slate-300">
                  {ev.category}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-blue-950 dark:text-white">{ev.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-700 dark:text-[#fde047]" />
                <span>
                  {ev.venue} · {ev.timeRange}
                </span>
              </p>
            </button>
          ))}
          {filteredCalendar.length === 0 && (
            <p className="col-span-full py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No scheduled events under this filter.
            </p>
          )}
        </div>
      </div>

      {/* Calendar Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedEvent.title}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-slate-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#fde047]">
                  {selectedEvent.category} · {selectedEvent.date}
                </p>
                <h3 className="text-base font-bold">{selectedEvent.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                aria-label="Close event modal"
                className="p-1 text-blue-100 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-700 dark:text-slate-200">
              <p>{selectedEvent.description}</p>
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-slate-800/70 text-xs space-y-1.5">
                <p>
                  <strong>Date &amp; Time:</strong> {selectedEvent.date} · {selectedEvent.timeRange}
                </p>
                <p>
                  <strong>Venue:</strong> {selectedEvent.venue}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile(
                      `${selectedEvent.id}.ics`,
                      generateCalendarIcs(selectedEvent),
                      'text/calendar;charset=utf-8',
                      onNotify
                    )
                  }
                  className="px-4 py-2 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
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
