import { useMemo, useState } from 'react';
import { Download, Eye, FileCheck2, Search, Wallet } from 'lucide-react';
import { downloadResolutionPdf } from '../../lib/downloadEngine.ts';
import type { PortalState } from '../../lib/portalStore.ts';
import type { LetterheadDocumentPayload } from '../DocumentLetterheadModal.tsx';

export function ResolutionsFundsSection({
  portal,
  onOpenLetterhead,
  onNotify,
}: {
  portal: PortalState;
  onOpenLetterhead: (doc: LetterheadDocumentPayload) => void;
  onNotify: (msg: string) => void;
}) {
  const [search, setSearch] = useState('');

  const filteredResolutions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return portal.resolutions;
    return portal.resolutions.filter(
      (r) =>
        r.numberCode.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.sponsor.toLowerCase().includes(q)
    );
  }, [portal.resolutions, search]);

  const fundTotals = useMemo(() => {
    const totalAllocated = portal.funds.reduce((sum, f) => sum + f.allocatedAmount, 0);
    const totalSpent = portal.funds.reduce((sum, f) => sum + f.spentAmount, 0);
    const remaining = totalAllocated - totalSpent;
    return { totalAllocated, totalSpent, remaining };
  }, [portal.funds]);

  return (
    <section className="space-y-12">
      {/* 1. SSLG FUNDS & BUDGET OVERVIEW (Blue & Compre Yellow, NO Export Public Ledger button) */}
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-[#fde047]">
            SY {portal.schoolYear} Financial Stewardship
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-blue-700 dark:text-[#fde047]" />
            <span>SSLG Funds &amp; Budget Overview</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1e3a8a] text-white rounded-2xl border border-blue-900 p-5">
            <p className="text-xs font-bold text-[#fde047]">Total Approved Allocation</p>
            <p className="text-2xl font-extrabold mt-1 tabular-nums">
              PHP {fundTotals.totalAllocated.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Disbursed
            </p>
            <p className="text-2xl font-extrabold text-blue-900 dark:text-white mt-1 tabular-nums">
              PHP {fundTotals.totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl border border-[#eab308]/60 dark:border-yellow-500/40 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Available Balance
            </p>
            <p className="text-2xl font-extrabold text-blue-800 dark:text-[#fde047] mt-1 tabular-nums">
              PHP {fundTotals.remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portal.funds.map((fund) => {
            const pct =
              fund.allocatedAmount > 0
                ? Math.min(100, Math.round((fund.spentAmount / fund.allocatedAmount) * 100))
                : 0;
            const bal = fund.allocatedAmount - fund.spentAmount;
            return (
              <div
                key={fund.id}
                className="backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-blue-950 dark:text-white">
                      {fund.category}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {fund.notes}
                    </p>
                  </div>
                  <span className="font-mono-code text-xs font-extrabold text-blue-800 dark:text-[#fde047] tabular-nums shrink-0">
                    {pct}% used
                  </span>
                </div>

                <div className="h-2.5 rounded-full bg-blue-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1e3a8a] to-[#facc15]"
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code tabular-nums">
                  <span className="text-slate-600 dark:text-slate-300">
                    Allocated: PHP {fund.allocatedAmount.toLocaleString('en-PH')}
                  </span>
                  <span className="font-bold text-blue-900 dark:text-yellow-300">
                    Remaining: PHP {bal.toLocaleString('en-PH')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. OFFICIAL RESOLUTIONS REPOSITORY (View PDF & Download PDF) */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-[#fde047]">
              Official Legislative Archive
            </p>
            <h2 className="text-2xl font-extrabold text-blue-950 dark:text-white">
              Official NNCHS SSLG Resolutions
            </h2>
          </div>

          <div className="relative sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resolution no. or title..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResolutions.map((rec) => (
            <article
              key={rec.id}
              className="backdrop-blur-md bg-white/75 dark:bg-slate-900/75 rounded-2xl border border-blue-900/10 dark:border-yellow-400/20 shadow-sm p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="font-mono-code font-extrabold text-blue-800 dark:text-[#fde047]">
                    {rec.numberCode}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{rec.datePassed}</span>
                </div>
                <h3 className="text-base font-extrabold text-blue-950 dark:text-white leading-snug flex items-start gap-2">
                  <FileCheck2 className="w-4 h-4 text-blue-700 dark:text-[#facc15] mt-1 shrink-0" />
                  <span>{rec.title}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {rec.summary}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sponsor: {rec.sponsor}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onOpenLetterhead({
                      title: `${rec.numberCode}: ${rec.title}`,
                      docCode: rec.numberCode,
                      categoryLabel: 'Official NNCHS SSLG Resolution',
                      dateLabel: rec.datePassed,
                      bodyText: rec.fullText,
                      resolutionRecord: rec,
                    })
                  }
                  className="flex-1 py-2 px-3 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#fde047]" />
                  <span>View PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadResolutionPdf(rec, onNotify)}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
