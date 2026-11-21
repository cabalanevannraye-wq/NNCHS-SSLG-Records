import { useMemo, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  Eye,
  Printer,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { api, getDocumentFileUrl } from '../lib/api.ts';
import {
  ALL_CATEGORIES,
  CORE_VALUES,
  type SSLGDocument,
  type UserAccount,
  type WorkflowStage,
} from '../types.ts';
import { StageBadge } from './SSLGCrest.tsx';

interface ControlRegisterViewProps {
  documents: SSLGDocument[];
  currentUser: UserAccount;
  onSelectTrack: (doc: SSLGDocument) => void;
  onPrintEartag: (doc: SSLGDocument) => void;
  onPrintBatchTransmittal: (docs: SSLGDocument[]) => void;
  onPreviewFile: (doc: SSLGDocument) => void;
  onDocumentUpdated: (doc: SSLGDocument) => void;
}

export function ControlRegisterView({
  documents,
  currentUser,
  onSelectTrack,
  onPrintEartag,
  onPrintBatchTransmittal,
  onPreviewFile,
  onDocumentUpdated,
}: ControlRegisterViewProps) {
  const [search, setSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | 'general' | 'accomplishment'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [coreValueFilter, setCoreValueFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | WorkflowStage>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editControlValue, setEditControlValue] = useState('');
  const [editError, setEditError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents
      .filter((d) => {
        if (docTypeFilter !== 'ALL' && d.docType !== docTypeFilter) return false;
        if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false;
        if (coreValueFilter !== 'ALL' && d.coreValue !== coreValueFilter) return false;
        if (stageFilter !== 'ALL' && d.currentStage !== stageFilter) return false;
        if (!q) return true;
        return (
          (d.controlNumber || '').toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.organizationName.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (d.coreValue || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.controlNumber && b.controlNumber) {
          return b.controlNumber.localeCompare(a.controlNumber);
        }
        if (a.controlNumber && !b.controlNumber) return 1;
        if (!a.controlNumber && b.controlNumber) return -1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [documents, search, docTypeFilter, categoryFilter, coreValueFilter, stageFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = filtered.map((d) => d.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...visibleIds])));
    }
  };

  const saveControlNumber = async (docId: string) => {
    setEditError('');
    try {
      const updated = await api.updateControlNumber(docId, editControlValue);
      onDocumentUpdated(updated);
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update control number');
    }
  };

  const selectedDocs = documents.filter((d) => selectedIds.includes(d.id));

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Module Filter Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                ['ALL', 'All Records'],
                ['general', 'General Documents (SSLG)'],
                ['accomplishment', 'Accomplishment Reports (AR)'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setDocTypeFilter(val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  docTypeFilter === val
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {selectedDocs.length > 0 && (
            <button
              type="button"
              onClick={() => onPrintBatchTransmittal(selectedDocs)}
              className="px-4 py-2 text-sm font-semibold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Print Batch Transmittal Slip ({selectedDocs.length})</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Control No., Author / Club, Title..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {docTypeFilter !== 'general' && (
            <select
              value={coreValueFilter}
              onChange={(e) => setCoreValueFilter(e.target.value)}
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

          <select
            value={stageFilter === 'ALL' ? 'ALL' : String(stageFilter)}
            onChange={(e) =>
              setStageFilter(e.target.value === 'ALL' ? 'ALL' : (Number(e.target.value) as WorkflowStage))
            }
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Stages (1–5)</option>
            <option value="1">Stage 1 · Submitted</option>
            <option value="2">Stage 2 · For E-Sign</option>
            <option value="3">Stage 3 · Control No. &amp; Eartag</option>
            <option value="4">Stage 4 · Printed</option>
            <option value="5">Stage 5 · Completed &amp; Archived</option>
          </select>
        </div>
      </div>

      {editError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {editError}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all visible records"
                    checked={filtered.length > 0 && filtered.every((d) => selectedIds.includes(d.id))}
                    onChange={toggleAllVisible}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Control Number</th>
                <th className="py-3 px-3 whitespace-nowrap">Date</th>
                <th className="py-3 px-3">Author / Club</th>
                <th className="py-3 px-3">Document Title</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Workflow Stage (1–5)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No records match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(doc.id)}
                        onChange={() => toggleSelect(doc.id)}
                        aria-label={`Select ${doc.title}`}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {editingId === doc.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editControlValue}
                            onChange={(e) => setEditControlValue(e.target.value)}
                            placeholder="SSLG-2026-0001"
                            className="w-32 px-2 py-1 text-xs font-mono-code border border-blue-600 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => saveControlNumber(doc.id)}
                            className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                            aria-label="Save control number"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                            aria-label="Cancel edit"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono-code text-xs font-bold tabular-nums ${
                              doc.controlNumber ? 'text-blue-900' : 'text-slate-400 italic'
                            }`}
                          >
                            {doc.controlNumber || 'Pending E-Sign'}
                          </span>
                          {currentUser.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(doc.id);
                                setEditControlValue(doc.controlNumber || '');
                                setEditError('');
                              }}
                              title="Assign / Edit Control Number"
                              className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono-code text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {doc.documentDate}
                    </td>
                    <td className="py-3 px-3 text-xs font-medium text-slate-800">
                      {doc.organizationName}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 max-w-xs">
                      <button
                        type="button"
                        onClick={() => onSelectTrack(doc)}
                        className="text-left hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {doc.title}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                      <div>{doc.category}</div>
                      {doc.coreValue && (
                        <div className="text-[11px] font-medium text-blue-800">{doc.coreValue}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <StageBadge stage={doc.currentStage} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {doc.currentStage >= 3 && doc.controlNumber && (
                          <button
                            type="button"
                            onClick={() => onPrintEartag(doc)}
                            title="Print Eartag"
                            className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-100 rounded-md inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span>Eartag</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onPreviewFile(doc)}
                          title="Preview Document"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={getDocumentFileUrl(doc.id, { download: true })}
                          download
                          title="Download File"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
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
