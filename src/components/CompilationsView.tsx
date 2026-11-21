import { useMemo, useState } from 'react';
import { Download, FileStack, Printer } from 'lucide-react';
import { getCompilationPdfUrl } from '../lib/api.ts';
import {
  ACCOMPLISHMENT_CATEGORIES,
  ALL_CATEGORIES,
  CORE_VALUES,
  GENERAL_CATEGORIES,
  type SSLGDocument,
  type SystemSettings,
} from '../types.ts';
import { SSLGCrest, StageBadge } from './SSLGCrest.tsx';

export function CompilationPrintableSheet({
  documents,
  settings,
  periodLabel,
  categoryLabel,
}: {
  documents: SSLGDocument[];
  settings: SystemSettings;
  periodLabel: string;
  categoryLabel: string;
}) {
  return (
    <div className="bg-white p-6 text-slate-900 max-w-[820px] mx-auto">
      <div className="border-2 border-slate-900 p-6 mb-6">
        <div className="flex items-center gap-4 border-b border-slate-300 pb-4 mb-4">
          <SSLGCrest className="w-12 h-12 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {settings.organizationHeader} · School Year {settings.schoolYear}
            </p>
            <h2 className="text-xl font-bold text-slate-950">
              SSLG RECORDS &amp; TRANSMITTAL SYSTEM
            </h2>
          </div>
        </div>
        <h3 className="text-lg font-bold text-blue-900">
          OFFICIAL PERIODIC DOCUMENT COMPILATION &amp; MASTER REGISTER
        </h3>
        <div className="grid grid-cols-3 gap-4 mt-4 text-xs bg-slate-50 border border-slate-200 p-3 rounded">
          <div>
            <span className="text-slate-500">Reporting Period:</span>
            <p className="font-bold text-slate-900">{periodLabel}</p>
          </div>
          <div>
            <span className="text-slate-500">Category Filter:</span>
            <p className="font-bold text-slate-900">{categoryLabel}</p>
          </div>
          <div>
            <span className="text-slate-500">Total Records:</span>
            <p className="font-bold text-slate-900 tabular-nums">{documents.length}</p>
          </div>
        </div>
      </div>

      <table className="w-full text-xs border-collapse border border-slate-400">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-400 text-left">
            <th className="py-2 px-2 border-r border-slate-300">#</th>
            <th className="py-2 px-2 border-r border-slate-300">Control No.</th>
            <th className="py-2 px-2 border-r border-slate-300">Date</th>
            <th className="py-2 px-2 border-r border-slate-300">Document Title</th>
            <th className="py-2 px-2 border-r border-slate-300">Author / Club</th>
            <th className="py-2 px-2 border-r border-slate-300">Category</th>
            <th className="py-2 px-2">Stage</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, idx) => (
            <tr key={doc.id} className="border-b border-slate-300">
              <td className="py-2 px-2 border-r border-slate-300 tabular-nums">{idx + 1}</td>
              <td className="py-2 px-2 border-r border-slate-300 font-mono-code font-bold text-blue-900">
                {doc.controlNumber || 'Pending'}
              </td>
              <td className="py-2 px-2 border-r border-slate-300 font-mono-code tabular-nums">
                {doc.documentDate}
              </td>
              <td className="py-2 px-2 border-r border-slate-300 font-semibold">{doc.title}</td>
              <td className="py-2 px-2 border-r border-slate-300">{doc.organizationName}</td>
              <td className="py-2 px-2 border-r border-slate-300">{doc.category}</td>
              <td className="py-2 px-2">Stage {doc.currentStage} of 5</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CompilationsViewProps {
  documents: SSLGDocument[];
  settings: SystemSettings;
  onPrintCompilationSheet: (params: {
    documents: SSLGDocument[];
    periodLabel: string;
    categoryLabel: string;
  }) => void;
  onOpenCompiledPdf: (pdfUrl: string, title: string) => void;
}

const MONTHS = [
  ['01', 'January'],
  ['02', 'February'],
  ['03', 'March'],
  ['04', 'April'],
  ['05', 'May'],
  ['06', 'June'],
  ['07', 'July'],
  ['08', 'August'],
  ['09', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
];

export function CompilationsView({
  documents,
  onPrintCompilationSheet,
  onOpenCompiledPdf,
}: CompilationsViewProps) {
  const [docType, setDocType] = useState<'ALL' | 'general' | 'accomplishment'>('ALL');
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'annual'>('annual');
  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('11');
  const [quarter, setQuarter] = useState('Q4');
  const [category, setCategory] = useState('ALL');
  const [coreValue, setCoreValue] = useState('ALL');

  const categoryChoices = useMemo(() => {
    if (docType === 'general') return GENERAL_CATEGORIES;
    if (docType === 'accomplishment') return ACCOMPLISHMENT_CATEGORIES;
    return ALL_CATEGORIES;
  }, [docType]);

  const availableYears = useMemo(() => {
    const yrs = new Set<string>(['2026']);
    documents.forEach((d) => {
      const y = d.documentDate.split('-')[0];
      if (y) yrs.add(y);
    });
    return Array.from(yrs).sort().reverse();
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents
      .filter((d) => {
        if (docType !== 'ALL' && d.docType !== docType) return false;
        if (category !== 'ALL' && d.category !== category) return false;
        if (coreValue !== 'ALL' && d.coreValue !== coreValue) return false;
        const [y, m] = d.documentDate.split('-');
        if (y !== year) return false;
        const mNum = Number(m);
        if (periodType === 'monthly') return mNum === Number(month);
        if (periodType === 'quarterly') return `Q${Math.ceil(mNum / 3)}` === quarter;
        return true;
      })
      .sort((a, b) => (a.controlNumber || 'ZZZ').localeCompare(b.controlNumber || 'ZZZ'));
  }, [documents, docType, category, coreValue, year, month, quarter, periodType]);

  const periodLabel = useMemo(() => {
    if (periodType === 'monthly') {
      const name = MONTHS.find(([num]) => num === month)?.[1] || month;
      return `${name} ${year}`;
    }
    if (periodType === 'quarterly') return `${quarter} ${year}`;
    return `Annual ${year}`;
  }, [periodType, month, quarter, year]);

  const baseCategoryLabel =
    category === 'ALL'
      ? docType === 'general'
        ? 'All General Documents'
        : docType === 'accomplishment'
        ? 'All Accomplishment Reports'
        : 'All Categories'
      : category;

  const categoryLabel =
    coreValue !== 'ALL' ? `${baseCategoryLabel} (${coreValue})` : baseCategoryLabel;

  const compiledPdfUrl = getCompilationPdfUrl({
    periodType,
    year,
    month,
    quarter,
    category,
    coreValue,
    docType,
  });

  const stage5Count = filteredDocs.filter((d) => d.currentStage === 5).length;
  const numberedCount = filteredDocs.filter((d) => d.controlNumber !== null).length;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Module toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  ['ALL', 'All Records'],
                  ['general', 'General Docs'],
                  ['accomplishment', 'Accomplishment Reports'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setDocType(val);
                    setCategory('ALL');
                    if (val === 'general') setCoreValue('ALL');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    docType === val
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Period Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  ['monthly', 'Monthly'],
                  ['quarterly', 'Quarterly (Q1–Q4)'],
                  ['annual', 'Annual'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPeriodType(val)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    periodType === val
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                onPrintCompilationSheet({
                  documents: filteredDocs,
                  periodLabel,
                  categoryLabel,
                })
              }
              className="px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Print Compilation</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onOpenCompiledPdf(
                  compiledPdfUrl,
                  `Compiled PDF Binder — ${periodLabel} (${categoryLabel})`
                )
              }
              className="px-4 py-2 text-sm font-semibold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <FileStack className="w-4 h-4" />
              <span>Open Merged Binder PDF</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {periodType === 'monthly' && (
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {MONTHS.map(([num, name]) => (
                <option key={num} value={num}>
                  {name}
                </option>
              ))}
            </select>
          )}

          {periodType === 'quarterly' && (
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="Q1">Q1 (Jan – Mar)</option>
              <option value="Q2">Q2 (Apr – Jun)</option>
              <option value="Q3">Q3 (Jul – Sep)</option>
              <option value="Q4">Q4 (Oct – Dec)</option>
            </select>
          )}

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Categories</option>
            {categoryChoices.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {docType !== 'general' && (
            <select
              value={coreValue}
              onChange={(e) => setCoreValue(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Core Values</option>
              {CORE_VALUES.map((cv) => (
                <option key={cv} value={cv}>
                  {cv}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-200 text-sm">
          <div>
            <p className="text-xs text-slate-500">Selected Period</p>
            <p className="font-bold text-slate-900">{periodLabel}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Records Matched</p>
            <p className="font-bold text-slate-900 tabular-nums">{filteredDocs.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Control No. Issued</p>
            <p className="font-bold text-blue-900 tabular-nums">{numberedCount}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Stage 5 Archived</p>
            <p className="font-bold text-emerald-800 tabular-nums">{stage5Count}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {periodLabel} · {categoryLabel}
          </h3>
          <a
            href={compiledPdfUrl}
            download={`SSLG_Compilation_${periodLabel.replace(/\s+/g, '_')}.pdf`}
            className="text-xs font-semibold text-blue-800 hover:underline inline-flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Merged PDF</span>
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Control No.</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Document Title</th>
                <th className="py-3 px-3">Author / Club</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-4">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No records found for {periodLabel} in {categoryLabel}.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono-code text-xs font-bold text-blue-900 tabular-nums whitespace-nowrap">
                      {doc.controlNumber || 'Pending E-Sign'}
                    </td>
                    <td className="py-3 px-3 font-mono-code text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {doc.documentDate}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">{doc.title}</td>
                    <td className="py-3 px-3 text-xs text-slate-700">{doc.organizationName}</td>
                    <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                      <div>{doc.category}</div>
                      {doc.coreValue && (
                        <div className="text-[11px] font-medium text-blue-800">{doc.coreValue}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StageBadge stage={doc.currentStage} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
