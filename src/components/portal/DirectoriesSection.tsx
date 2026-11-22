import { useMemo, useState } from 'react';
import { ExternalLink, Search, Users } from 'lucide-react';
import type { PortalState } from '../../lib/portalStore.ts';
import { UserAvatar } from '../SSLGCrest.tsx';

export type DirectorySubTab = 'officers' | 'clubs';

export function DirectoriesSection({
  portal,
  initialSubTab = 'officers',
}: {
  portal: PortalState;
  initialSubTab?: DirectorySubTab;
}) {
  const [subTab, setSubTab] = useState<DirectorySubTab>(initialSubTab);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [clusterFilter, setClusterFilter] = useState('All');

  const filteredOfficers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return portal.officers.filter((o) => {
      const matchesGrade = gradeFilter === 'All' || o.gradeLevel === gradeFilter;
      const matchesQ =
        !q ||
        o.fullName.toLowerCase().includes(q) ||
        o.position.toLowerCase().includes(q) ||
        o.gradeLevel.toLowerCase().includes(q) ||
        o.section.toLowerCase().includes(q) ||
        o.bio.toLowerCase().includes(q);
      return matchesGrade && matchesQ;
    });
  }, [portal.officers, search, gradeFilter]);

  const clusters = useMemo(
    () => Array.from(new Set(portal.clubs.map((c) => c.cluster))),
    [portal.clubs]
  );

  const filteredClubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return portal.clubs.filter((c) => {
      const matchesCluster = clusterFilter === 'All' || c.cluster === clusterFilter;
      const matchesQ =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.acronym.toLowerCase().includes(q) ||
        c.presidentName.toLowerCase().includes(q) ||
        c.adviserName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);
      return matchesCluster && matchesQ;
    });
  }, [portal.clubs, search, clusterFilter]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-yellow-300">
            Student Leadership &amp; Organizations · SY {portal.schoolYear}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight">
            SSLG Officers &amp; Registered Clubs Directory
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Connect directly with your elected NNCHS SSLG Officers and recognized student
            organizations across campus.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-blue-50 dark:bg-slate-800 p-1 rounded-xl border border-blue-200 dark:border-slate-700 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('officers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'officers'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:text-blue-900 dark:hover:text-yellow-300'
            }`}
          >
            SSLG Officers ({portal.officers.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('clubs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'clubs'
                ? 'bg-[#1e3a8a] text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-200 hover:text-blue-900 dark:hover:text-yellow-300'
            }`}
          >
            Clubs &amp; Organizations ({portal.clubs.length})
          </button>
        </div>
      </div>

      {/* Search & Filter Row */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              subTab === 'officers'
                ? 'Search officer name, position, grade, or section...'
                : 'Search club name, acronym, adviser, or president...'
            }
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
          />
        </div>

        {subTab === 'officers' ? (
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            aria-label="Filter officers by grade level"
            className="px-3.5 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Grade Levels</option>
            {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={clusterFilter}
            onChange={(e) => setClusterFilter(e.target.value)}
            aria-label="Filter clubs by cluster"
            className="px-3.5 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          >
            <option value="All">All Club Clusters</option>
            {clusters.map((cl) => (
              <option key={cl} value={cl}>
                {cl}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Officers Grid — Strictly Photo, Name, Position, Grade & Section, Bio, Facebook Profile Link */}
      {subTab === 'officers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredOfficers.map((officer) => (
            <article
              key={officer.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3.5">
                  <UserAvatar
                    fullName={officer.fullName}
                    avatarDataUrl={officer.photoUrl}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-blue-950 dark:text-white leading-tight">
                      {officer.fullName}
                    </h3>
                    <p className="text-xs font-bold text-blue-700 dark:text-[#fde047] mt-0.5">
                      {officer.position}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {officer.gradeLevel} · {officer.section}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {officer.bio}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <a
                  href={officer.facebookUrl || 'https://www.facebook.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Facebook Profile</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#fde047]" />
                </a>
              </div>
            </article>
          ))}
          {filteredOfficers.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800">
              No officers matched your search.
            </p>
          )}
        </div>
      )}

      {/* Registered Clubs Grid */}
      {subTab === 'clubs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClubs.map((club) => (
            <article
              key={club.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-blue-700 dark:text-[#fde047]">{club.cluster}</span>
                  <span className="text-slate-500 dark:text-slate-400">{club.status}</span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-blue-950 dark:text-white leading-snug">
                    {club.name}
                  </h3>
                  <p className="font-mono-code text-xs font-bold text-slate-500 dark:text-slate-400">
                    {club.acronym}
                  </p>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {club.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <p>
                  <strong className="text-blue-950 dark:text-white">President:</strong>{' '}
                  {club.presidentName}
                </p>
                <p>
                  <strong className="text-blue-950 dark:text-white">Adviser:</strong>{' '}
                  {club.adviserName}
                </p>
                <p className="inline-flex items-center gap-1.5 text-blue-800 dark:text-yellow-300 font-bold pt-1 tabular-nums">
                  <Users className="w-3.5 h-3.5" />
                  <span>{club.memberCount} Members</span>
                </p>
              </div>
            </article>
          ))}
          {filteredClubs.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800">
              No clubs matched your filter.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
