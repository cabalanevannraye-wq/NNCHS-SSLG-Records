import { useMemo, useState } from 'react';
import {
  Download,
  FileCheck2,
  Printer,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  downloadFileSafe,
  generateLedgerCsv,
  generateResolutionText,
} from '../../lib/downloadEngine.ts';
import type { LegislativeRecord, PortalState } from '../../lib/portalStore.ts';
import type { LetterheadDocumentPayload } from '../DocumentLetterheadModal.tsx';

export type TransparencySubTab = 'legislation' | 'finance';

export function TransparencySealSection({
  portal,
  initialSubTab = 'legislation',
  onOpenLetterhead,
  onNotify,
}: {
  portal: PortalState;
  initialSubTab?: TransparencySubTab;
  onOpenLetterhead: (doc: LetterheadDocumentPayload) => void;
  onNotify: (msg: string) => void;
}) {
  const [legSearch, setLegSearch] = useState('');
  const [docKindFilter, setDocKindFilter] = useState<
    'All' | LegislativeRecord['docKind']
  >('All');

  const filteredLegislation = useMemo(() => {
    const q = legSearch.trim().toLowerCase();
    return portal.legislation.filter((rec) => {
      const matchesKind = docKindFilter === 'All' || rec.docKind === docKindFilter;
      const matchesQ =
        !q ||
        rec.numberCode.toLowerCase().includes(q) ||
        rec.title.toLowerCase().includes(q) ||
        rec.summary.toLowerCase().includes(q) ||
        rec.sponsor.toLowerCase().includes(q);
      return matchesKind && matchesQ;
    });
  }, [portal.legislation, legSearch, docKindFilter]);

  const financeSummary = useMemo(() => {
    const totalIncome = portal.ledger
      .filter((e) => e.entryType === 'Allocation / Income')
      .reduce((acc, e) => acc + e.amount, 0);
    const totalExpense = portal.ledger
      .filter((e) => e.entryType === 'Disbursement / Expense')
      .reduce((acc, e) => acc + e.amount, 0);
    const remaining = totalIncome - totalExpense;
    const utilizationPct =
      totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;

    const byCommittee = new Map<string, number>();
    portal.ledger
      .filter((e) => e.entryType === 'Disbursement / Expense')
      .forEach((e) => {
        byCommittee.set(e.committee, (byCommittee.get(e.committee) || 0) + e.amount);
      });

    return {
      totalIncome,
      totalExpense,
      remaining,
      utilizationPct,
      committeeBreakdown: Array.from(byCommittee.entries()),
    };
  }, [portal.ledger]);

  return (
    <section className="space-y-8">
      {/* Philippine Government-Style Transparency Seal Banner */}
      <div className="bg-[#0f172a] text-white rounded-2xl border border-slate-800 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              NNCHS SSLG Transparency Seal · Full Disclosure Policy
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Public Legislative Archive &amp; Open Financial Ledger
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Every enacted resolution, executive order, memorandum, and cash disbursement voucher—
              including Free Academic Printing supplies—is published in full for student body
              inspection and CSV download.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            downloadFileSafe(
              `NNCHS_SSLG_Transparency_Ledger_${portal.schoolYear}.csv`,
              generateLedgerCsv(portal.ledger),
              'text/csv;charset=utf-8',
              onNotify
            )
          }
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>Export Public Ledger (.CSV)</span>
        </button>
      </div>

      {/* Financial Allocation & Utilization Panel */}
      <div
        className={`space-y-4 ${
          initialSubTab === 'finance' ? 'ring-2 ring-blue-500/20 rounded-2xl p-1' : ''
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Approved Fund
            </p>
            <p className="text-2xl font-extrabold text-slate-950 dark:text-white mt-1 tabular-nums">
              PHP {financeSummary.totalIncome.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Disbursed ({financeSummary.utilizationPct}%)
            </p>
            <p className="text-2xl font-extrabold text-blue-900 dark:text-blue-400 mt-1 tabular-nums">
              PHP {financeSummary.totalExpense.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Remaining Unencumbered Balance
            </p>
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
              PHP {financeSummary.remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Committee Utilization Breakdown + Public Voucher Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
              Committee Disbursement Breakdown
            </h3>
            <div className="space-y-3">
              {financeSummary.committeeBreakdown.map(([committee, spent]) => {
                const pct =
                  financeSummary.totalIncome > 0
                    ? Math.round((spent / financeSummary.totalIncome) * 100)
                    : 0;
                return (
                  <div key={committee} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {committee}
                      </span>
                      <span className="font-mono-code font-bold text-slate-900 dark:text-white tabular-nums">
                        PHP {spent.toLocaleString('en-PH')} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-800 dark:bg-blue-500"
                        style={{ width: `${Math.min(100, Math.max(6, pct * 2))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
                Public Voucher &amp; Liquidation Register
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {portal.ledger.length} entries
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                    <th className="py-2.5 px-4">Voucher</th>
                    <th className="py-2.5 px-4">Particulars</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {portal.ledger.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 px-4 font-mono-code font-bold text-blue-800 dark:text-blue-400 whitespace-nowrap">
                        {row.voucherNo}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200">
                        <p className="font-semibold">{row.particulars}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {row.date} · {row.committee}
                        </p>
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono-code font-bold whitespace-nowrap tabular-nums ${
                          row.entryType === 'Allocation / Income'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {row.entryType === 'Allocation / Income' ? '+' : '-'}PHP{' '}
                        {row.amount.toLocaleString('en-PH')}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.liquidationStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Searchable Legislative Archive */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
              Legislative Archive: Resolutions, Executive Orders &amp; Memoranda
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download complete official text or open the printable NNCHS SSLG letterhead PDF sheet.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={legSearch}
                onChange={(e) => setLegSearch(e.target.value)}
                placeholder="Search resolution number or title..."
                className="pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
            <select
              value={docKindFilter}
              onChange={(e) =>
                setDocKindFilter(e.target.value as 'All' | LegislativeRecord['docKind'])
              }
              aria-label="Filter legislative document type"
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Issuance Types</option>
              <option value="Resolution">Resolutions</option>
              <option value="Executive Order">Executive Orders</option>
              <option value="Memorandum">Memoranda</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLegislation.map((rec) => {
            const fullDoc = generateResolutionText(rec);
            const filename = `NNCHS_SSLG_${rec.numberCode.replace(/[^a-zA-Z0-9]+/g, '_')}.txt`;
            return (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="font-mono-code font-bold text-blue-800 dark:text-blue-400">
                      {rec.numberCode}
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {rec.status} · {rec.datePassed}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-950 dark:text-white leading-snug flex items-start gap-2">
                    <FileCheck2 className="w-4 h-4 text-amber-600 mt-1 shrink-0" />
                    <span>{rec.title}</span>
                  </h4>
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
                      downloadFileSafe(filename, fullDoc, 'text/plain;charset=utf-8', onNotify)
                    }
                    className="px-3.5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#0f172a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Official Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenLetterhead({
                        title: `${rec.numberCode}: ${rec.title}`,
                        docCode: rec.numberCode,
                        categoryLabel: rec.docKind,
                        dateLabel: rec.datePassed,
                        filename,
                        bodyText: fullDoc,
                      })
                    }
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>View &amp; Save as PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
          {filteredLegislation.length === 0 && (
            <p className="col-span-full text-center py-10 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No legislative documents matched your search.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
