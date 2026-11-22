import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  FileText,
  Megaphone,
  Printer,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { CampusNewsItem, PortalState } from '../../lib/portalStore.ts';
import { SSLGCrest } from '../SSLGCrest.tsx';
import type { PortalJumpTarget } from './PublicNavbar.tsx';

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const totalFrames = 26;
    const timer = window.setInterval(() => {
      frame += 1;
      const progress = Math.min(1, frame / totalFrames);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (frame >= totalFrames) {
        window.clearInterval(timer);
      }
    }, 22);

    return () => window.clearInterval(timer);
  }, [value]);

  return (
    <span className="tabular-nums">
      {display.toLocaleString('en-US')}
      {suffix}
    </span>
  );
}

interface QuickSearchHit {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  target: PortalJumpTarget;
}

export function LandingSection({
  portal,
  onNavigate,
}: {
  portal: PortalState;
  onNavigate: (target: PortalJumpTarget) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNewsModal, setActiveNewsModal] = useState<CampusNewsItem | null>(null);

  useEffect(() => {
    if (!activeNewsModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveNewsModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeNewsModal]);

  const searchHits = useMemo<QuickSearchHit[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: QuickSearchHit[] = [];

    portal.officers.forEach((o) => {
      if (
        o.fullName.toLowerCase().includes(q) ||
        o.position.toLowerCase().includes(q) ||
        o.digitalId.toLowerCase().includes(q) ||
        o.committee.toLowerCase().includes(q)
      ) {
        results.push({
          id: o.id,
          kind: 'Officer Directory',
          title: `${o.fullName} — ${o.position}`,
          subtitle: `${o.digitalId} · ${o.committee}`,
          target: { section: 'directories', subTab: 'officers' },
        });
      }
    });

    portal.clubs.forEach((c) => {
      if (
        c.name.toLowerCase().includes(q) ||
        c.acronym.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      ) {
        results.push({
          id: c.id,
          kind: 'Campus Club',
          title: `${c.name} (${c.acronym})`,
          subtitle: `${c.status} · Adviser: ${c.adviserName}`,
          target: { section: 'directories', subTab: 'clubs' },
        });
      }
    });

    portal.legislation.forEach((l) => {
      if (
        l.numberCode.toLowerCase().includes(q) ||
        l.title.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q)
      ) {
        results.push({
          id: l.id,
          kind: l.docKind,
          title: `${l.numberCode}: ${l.title}`,
          subtitle: `${l.datePassed} · ${l.status}`,
          target: { section: 'transparency', subTab: 'legislation' },
        });
      }
    });

    portal.programs.forEach((p) => {
      if (p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q)) {
        results.push({
          id: p.id,
          kind: 'Program',
          title: p.title,
          subtitle: `${p.status} · ${p.venue}`,
          target: { section: 'services', subTab: 'programs' },
        });
      }
    });

    portal.printJobs.forEach((j) => {
      if (
        j.jobCode.toLowerCase().includes(q) ||
        j.studentName.toLowerCase().includes(q) ||
        j.documentTitle.toLowerCase().includes(q)
      ) {
        results.push({
          id: j.id,
          kind: 'Print Queue',
          title: `${j.jobCode} · ${j.documentTitle}`,
          subtitle: `${j.studentName} · ${j.status}`,
          target: { section: 'services', subTab: 'printing' },
        });
      }
    });

    portal.tickets.forEach((t) => {
      if (t.ticketCode.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)) {
        results.push({
          id: t.id,
          kind: 'Grievance Ticket',
          title: `${t.ticketCode} · ${t.subject}`,
          subtitle: `Status: ${t.status}`,
          target: { section: 'reporting', subTab: 'track' },
        });
      }
    });

    return results.slice(0, 7);
  }, [searchQuery, portal]);

  const featuredNews = portal.news.find((n) => n.featured) || portal.news[0];

  return (
    <div className="space-y-12">
      {/* Executive Institutional Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#0f172a] text-white border border-slate-800 shadow-lg">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 82% 20%, rgba(245, 158, 11, 0.42), transparent 45%), radial-gradient(circle at 18% 85%, rgba(30, 58, 138, 0.75), transparent 52%)',
          }}
        />

        <div className="relative px-6 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-300 tracking-wide uppercase">
              <span>Republic of the Philippines · DepEd Region XI</span>
              <span className="text-slate-500">·</span>
              <span>Nabunturan, Davao de Oro</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.15]">
              Nabunturan National Comprehensive High School — Supreme Secondary Learner Government
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              The official one-stop civic student portal of NNCHS SSLG. Access zero-login Free
              Academic Printing with instant SMS alerts, public officer &amp; club directories,
              confidential student welfare reporting, and real-time Transparency Seal archives.
            </p>

            {/* Quick Cross-Portal Search */}
            <div className="relative max-w-xl pt-1">
              <div className="flex items-center bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
                <Search className="w-4 h-4 text-slate-400 ml-3.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search officers, clubs, PRT-2026 codes, resolutions, or tickets..."
                  className="w-full px-3 py-3 text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear quick search"
                    className="p-2 mr-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {searchQuery.trim() && (
                <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl z-30 overflow-hidden">
                  {searchHits.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      No matching NNCHS records found for &ldquo;{searchQuery}&rdquo;.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                      {searchHits.map((hit) => (
                        <button
                          key={`${hit.kind}-${hit.id}`}
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            onNavigate(hit.target);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                              {hit.kind}
                            </p>
                            <p className="text-xs font-bold truncate">{hit.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {hit.subtitle}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Primary Student CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate({ section: 'services', subTab: 'printing' })}
                className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Request Free Printing (SMS Alert)</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate({ section: 'reporting', subTab: 'submit' })}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Megaphone className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Report a Student Concern</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate({ section: 'transparency' })}
                className="px-4 py-3 rounded-xl bg-transparent hover:bg-white/10 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Transparency Seal</span>
              </button>
            </div>
          </div>

          {/* Right Official Seal & Quick Access Card */}
          <div className="lg:col-span-4 bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <SSLGCrest className="w-16 h-16 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Official Learner Seal
                </p>
                <h2 className="text-base font-bold text-white leading-snug">
                  SY {portal.schoolYear} Executive Council
                </h2>
                <p className="text-xs text-slate-400">Room 104 · Nabunturan West District</p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Free Print Quota</span>
                <span className="font-bold text-white tabular-nums">15 B&amp;W Pages / Day</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Admin SMS Gateway</span>
                <span className="font-mono-code font-bold text-amber-300">09163866252</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Office Claim Windows</span>
                <span className="font-semibold text-white">Recess · Lunch · 4PM</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate({ section: 'directories' })}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Browse Officers &amp; Clubs Directory</span>
            </button>
          </div>
        </div>
      </section>

      {/* Horizontal Announcement Ticker */}
      <div
        aria-label="Live Campus Advisories"
        className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 overflow-hidden flex items-center"
      >
        <div className="px-4 py-2.5 bg-amber-500 text-slate-950 text-xs font-extrabold uppercase tracking-wider shrink-0 flex items-center gap-2">
          <Megaphone className="w-3.5 h-3.5" />
          <span>Campus Advisory</span>
        </div>
        <div className="flex-1 overflow-hidden py-2.5">
          <div className="animate-sslg-ticker text-xs font-semibold text-amber-950 dark:text-amber-200 gap-10 whitespace-nowrap px-4">
            {[...portal.tickerMessages, ...portal.tickerMessages].map((msg, idx) => (
              <span key={idx} className="inline-flex items-center gap-3">
                <span>{msg}</span>
                <span className="text-amber-500 font-bold">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Impact Metrics + Constitutional Mandate */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
              Constitutional Mandate
            </p>
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              Responsive Student Governance Grounded in DepEd Core Values
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Guided by DepEd Order No. 18, s. 2023, the NNCHS SSLG bridges learners, accredited
              organizations, and school administration through measurable services—from daily academic
              printing assistance to open financial liquidation.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <div>Maka-Diyos · Values &amp; Integrity</div>
            <div>Maka-Tao · Student Welfare First</div>
            <div>Maka-Kalikasan · Berde Campus</div>
            <div>Makabansa · Civic Leadership</div>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
            <Printer className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white">
                <AnimatedCounter value={portal.impactCounters.freePagesPrinted} suffix="+" />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Free Pages Printed
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white">
                <AnimatedCounter value={portal.clubs.length} />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Accredited &amp; Active Clubs
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
            <FileText className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white">
                <AnimatedCounter value={portal.impactCounters.resolutionsPassed} />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Resolutions Enacted
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
            <BookOpen className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white">
                <AnimatedCounter value={portal.impactCounters.projectsImplemented} />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Projects Implemented
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
            <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white">
                <AnimatedCounter value={portal.impactCounters.concernsResolved} />
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                Welfare Concerns Resolved
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate({ section: 'calendar' })}
            className="bg-blue-900 hover:bg-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 text-white rounded-2xl border border-blue-800 p-5 flex flex-col justify-between text-left transition-colors cursor-pointer"
          >
            <Calendar className="w-5 h-5 text-amber-300" />
            <div className="mt-4">
              <p className="text-sm font-bold">Upcoming Activities</p>
              <p className="text-xs text-blue-200 mt-1 inline-flex items-center gap-1">
                <span>View {portal.calendarEvents.length} scheduled events</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Bulletin Board News & Official Updates Grid */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
              Official Bulletin Board
            </p>
            <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              Campus News, Advisories &amp; Policy Updates
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ section: 'calendar' })}
            className="text-xs font-bold text-blue-800 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open School Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {featuredNews && (
            <article className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Featured · {featuredNews.category} · {featuredNews.publishedAt}
                </div>
                <h3 className="text-xl font-bold text-slate-950 dark:text-white leading-snug">
                  {featuredNews.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {featuredNews.summary}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {featuredNews.author}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveNewsModal(featuredNews)}
                  className="text-xs font-bold text-blue-800 dark:text-blue-400 hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Read Full Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          )}

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {portal.news
              .filter((n) => n.id !== featuredNews?.id)
              .map((item) => (
                <article
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {item.category} · {item.publishedAt}
                    </p>
                    <h3 className="text-base font-bold text-slate-950 dark:text-white leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {item.summary}
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 truncate">{item.author}</span>
                    <button
                      type="button"
                      onClick={() => setActiveNewsModal(item)}
                      className="text-xs font-bold text-blue-800 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
                    >
                      Read →
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>

      {/* Full News Article Reader Modal */}
      {activeNewsModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveNewsModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activeNewsModal.title}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-300">
                  {activeNewsModal.category} · {activeNewsModal.publishedAt}
                </p>
                <h3 className="text-base font-bold text-white truncate">{activeNewsModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveNewsModal(null)}
                aria-label="Close article"
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Issued by {activeNewsModal.author}
              </p>
              <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {activeNewsModal.fullBody}
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveNewsModal(null)}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-800 text-white rounded-lg cursor-pointer"
                >
                  Close Bulletin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
