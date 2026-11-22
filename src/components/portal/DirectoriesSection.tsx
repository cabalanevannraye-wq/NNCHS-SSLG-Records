import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  GraduationCap,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type {
  HomeroomRep,
  PortalState,
  PublicClub,
  PublicOfficer,
} from '../../lib/portalStore.ts';
import { SSLGCrest, UserAvatar } from '../SSLGCrest.tsx';

export type DirectorySubTab = 'officers' | 'clubs' | 'homerooms';

export function DirectoriesSection({
  portal,
  initialSubTab = 'officers',
}: {
  portal: PortalState;
  initialSubTab?: DirectorySubTab;
}) {
  const [subTab, setSubTab] = useState<DirectorySubTab>(initialSubTab);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [clubStatusFilter, setClubStatusFilter] = useState<'All' | 'Accredited' | 'Probationary'>('All');
  const [clubCategoryFilter, setClubCategoryFilter] = useState<string>('All');
  const [selectedOfficer, setSelectedOfficer] = useState<PublicOfficer | null>(null);
  const [selectedClub, setSelectedClub] = useState<PublicClub | null>(null);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedOfficer(null);
        setSelectedClub(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filteredOfficers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return portal.officers.filter((o) => {
      const matchesGrade = gradeFilter === 'All' || o.gradeLevel === gradeFilter;
      const matchesQ =
        !q ||
        o.fullName.toLowerCase().includes(q) ||
        o.position.toLowerCase().includes(q) ||
        o.committee.toLowerCase().includes(q) ||
        o.digitalId.toLowerCase().includes(q);
      return matchesGrade && matchesQ;
    });
  }, [portal.officers, search, gradeFilter]);

  const clubCategories = useMemo(
    () => Array.from(new Set(portal.clubs.map((c) => c.category))),
    [portal.clubs]
  );

  const filteredClubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return portal.clubs.filter((c) => {
      const matchesStatus = clubStatusFilter === 'All' || c.status === clubStatusFilter;
      const matchesCat = clubCategoryFilter === 'All' || c.category === clubCategoryFilter;
      const matchesQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.acronym.toLowerCase().includes(q) ||
        c.presidentName.toLowerCase().includes(q) ||
        c.adviserName.toLowerCase().includes(q);
      return matchesStatus && matchesCat && matchesQ;
    });
  }, [portal.clubs, search, clubStatusFilter, clubCategoryFilter]);

  const filteredHomerooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return portal.homeroomReps.filter((h: HomeroomRep) => {
      const matchesGrade = gradeFilter === 'All' || h.gradeLevel === gradeFilter;
      const matchesQ =
        !q ||
        h.presidentName.toLowerCase().includes(q) ||
        h.section.toLowerCase().includes(q) ||
        h.cluster.toLowerCase().includes(q);
      return matchesGrade && matchesQ;
    });
  }, [portal.homeroomReps, search, gradeFilter]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
            Official Public Roster · SY {portal.schoolYear}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            NNCHS Governance &amp; Organization Directories
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Inspect active SSLG officers, accredited campus clubs, and Grade 7–12 legislative
            council representatives.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
          {[
            { id: 'officers' as const, label: 'Executive Officers', count: portal.officers.length },
            { id: 'clubs' as const, label: 'Clubs & Orgs', count: portal.clubs.length },
            { id: 'homerooms' as const, label: 'Class Presidents', count: portal.homeroomReps.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSubTab(tab.id);
                setGradeFilter('All');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                subTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              subTab === 'officers'
                ? 'Search officer name, committee, position, or NNCHS-SSLG ID...'
                : subTab === 'clubs'
                ? 'Search club name, acronym, president, or adviser...'
                : 'Search homeroom president, section, or cluster...'
            }
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
          />
        </div>

        {(subTab === 'officers' || subTab === 'homerooms') && (
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            aria-label="Filter by grade level"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Grade Levels (7–12)</option>
            {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}

        {subTab === 'clubs' && (
          <div className="flex flex-wrap gap-2">
            <select
              value={clubStatusFilter}
              onChange={(e) =>
                setClubStatusFilter(e.target.value as 'All' | 'Accredited' | 'Probationary')
              }
              aria-label="Filter club status"
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Recognition Status</option>
              <option value="Accredited">Accredited</option>
              <option value="Probationary">Probationary</option>
            </select>
            <select
              value={clubCategoryFilter}
              onChange={(e) => setClubCategoryFilter(e.target.value)}
              aria-label="Filter club category"
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Categories</option>
              {clubCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab A: Executive Officers */}
      {subTab === 'officers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOfficers.map((officer) => (
            <div
              key={officer.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3.5">
                  <UserAvatar fullName={officer.fullName} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-code text-[11px] font-bold text-blue-800 dark:text-blue-400">
                        {officer.digitalId}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        {officer.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-950 dark:text-white truncate mt-0.5">
                      {officer.fullName}
                    </h3>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {officer.position}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {officer.committee}
                  </p>
                  <p>
                    {officer.gradeLevel} · {officer.section}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 line-clamp-2">{officer.bio}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {officer.officeHours}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedOfficer(officer)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-900 dark:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Verify Digital ID</span>
                </button>
              </div>
            </div>
          ))}
          {filteredOfficers.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
              No officers matched your search filter.
            </div>
          )}
        </div>
      )}

      {/* Tab B: Clubs & Organizations */}
      {subTab === 'clubs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClubs.map((club) => (
            <div
              key={club.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                  <span className="text-blue-800 dark:text-blue-400">{club.category}</span>
                  <span
                    className={
                      club.status === 'Accredited'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }
                  >
                    {club.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white leading-snug">
                    {club.name}
                  </h3>
                  <p className="font-mono-code text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {club.acronym}
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                  {club.mandate}
                </p>

                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <p>
                    <strong className="text-slate-800 dark:text-slate-200">President:</strong>{' '}
                    {club.presidentName}
                  </p>
                  <p>
                    <strong className="text-slate-800 dark:text-slate-200">Adviser:</strong>{' '}
                    {club.adviserName}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 tabular-nums">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{club.memberCount} Members</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedClub(club)}
                  className="text-xs font-bold text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Open Club Profile →
                </button>
              </div>
            </div>
          ))}
          {filteredClubs.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
              No campus organizations matched your criteria.
            </div>
          )}
        </div>
      )}

      {/* Tab C: Homeroom Legislative Council */}
      {subTab === 'homerooms' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  <th className="py-3 px-4">Grade Level</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Class President</th>
                  <th className="py-3 px-4">Cluster</th>
                  <th className="py-3 px-4">Class Adviser</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                {filteredHomerooms.map((rep) => (
                  <tr
                    key={rep.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-blue-900 dark:text-blue-400 whitespace-nowrap">
                      {rep.gradeLevel}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {rep.section}
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">
                      {rep.presidentName}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{rep.cluster}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{rep.adviser}</td>
                  </tr>
                ))}
                {filteredHomerooms.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      No homeroom representatives match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Digital ID Verification Modal */}
      {selectedOfficer && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedOfficer(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Verify ${selectedOfficer.digitalId}`}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-[#0f172a] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SSLGCrest className="w-8 h-8" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    NNCHS SSLG Verified Digital ID
                  </p>
                  <p className="font-mono-code text-xs font-bold">{selectedOfficer.digitalId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOfficer(null)}
                aria-label="Close Digital ID modal"
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <UserAvatar fullName={selectedOfficer.fullName} size="lg" />
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Official Status: {selectedOfficer.status}</span>
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-0.5">
                    {selectedOfficer.fullName}
                  </h3>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-400">
                    {selectedOfficer.position}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-xs">
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedOfficer.committee}</span>
                </p>
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    {selectedOfficer.gradeLevel} · {selectedOfficer.section} · {selectedOfficer.term}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <CalendarClock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedOfficer.officeHours}</span>
                </p>
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedOfficer.email}</span>
                </p>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedOfficer.bio}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Club Profile Modal */}
      {selectedClub && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedClub(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedClub.name}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-amber-400">
                  {selectedClub.category} · {selectedClub.status}
                </p>
                <h3 className="text-base font-bold text-white">{selectedClub.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClub(null)}
                aria-label="Close club profile"
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedClub.mandate}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Student President</span>
                  <strong className="text-slate-950 dark:text-white">
                    {selectedClub.presidentName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Faculty Adviser</span>
                  <strong className="text-slate-950 dark:text-white">
                    {selectedClub.adviserName}
                  </strong>
                </div>
                <div className="flex items-start gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-200">{selectedClub.schedule}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-200">{selectedClub.room}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Flagship Initiatives ({portal.schoolYear})
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200 list-disc pl-5">
                  {selectedClub.flagshipProjects.map((proj) => (
                    <li key={proj}>{proj}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
