import React, { useState } from 'react';
import { CheckCircle2, FileUp, Send, X } from 'lucide-react';
import { api } from '../lib/api.ts';
import {
  ACCOMPLISHMENT_CATEGORIES,
  CORE_VALUES,
  GENERAL_CATEGORIES,
  type CoreValue,
  type DocumentCategory,
  type DocumentModuleType,
  type SSLGDocument,
  type UserAccount,
} from '../types.ts';

interface PassDocumentModalProps {
  docType: DocumentModuleType;
  currentUser: UserAccount;
  onClose: () => void;
  onCreated: (doc: SSLGDocument) => void;
  onViewTracker: (doc: SSLGDocument) => void;
}

export function PassDocumentModal({
  docType,
  currentUser,
  onClose,
  onCreated,
  onViewTracker,
}: PassDocumentModalProps) {
  const categories =
    docType === 'accomplishment' ? ACCOMPLISHMENT_CATEGORIES : GENERAL_CATEGORIES;

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>(categories[0]);
  const [coreValue, setCoreValue] = useState<CoreValue>('Maka-Tao');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose] = useState('');
  const [organizationOverride, setOrganizationOverride] = useState(
    currentUser.role === 'organization' ? currentUser.positionOrClub : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdDoc, setCreatedDoc] = useState<SSLGDocument | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload your prepared file (PDF, DOCX, JPG, or PNG).');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);
      formData.append('title', title.trim());
      formData.append('category', category);
      if (docType === 'accomplishment') {
        formData.append('coreValue', coreValue);
      }
      formData.append('documentDate', documentDate);
      formData.append('purpose', purpose.trim());
      if (currentUser.role !== 'organization' && organizationOverride.trim()) {
        formData.append('organizationOverride', organizationOverride.trim());
      }
      const created = await api.uploadDocument(formData);
      setCreatedDoc(created);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  };

  const moduleLabel =
    docType === 'accomplishment' ? 'Accomplishment Report' : 'General Document';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Stage 1: Submit {moduleLabel}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Upload your externally prepared file. Control Number &amp; Eartag unlock at Stage 3 after E-Sign.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdDoc ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-950">
                  Stage 1 Complete — {moduleLabel} Uploaded
                </h4>
                <p className="text-xs text-emerald-800 mt-1">
                  Your file is now in the queue for <strong>Stage 2: Electronic Signature</strong>.
                  Once e-signed by an SSLG Officer or the SSLG President, a sequential Control
                  Number will be generated automatically.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-1.5">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Title:</span>
                <span className="font-semibold text-slate-900 text-right">{createdDoc.title}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Category:</span>
                <span className="text-slate-900">{createdDoc.category}</span>
              </div>
              {createdDoc.coreValue && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Core Value:</span>
                  <span className="font-semibold text-slate-900">{createdDoc.coreValue}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Current Stage:</span>
                <span className="font-semibold text-blue-800">{createdDoc.stageLabel}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewTracker(createdDoc);
                }}
                className="px-5 py-2.5 text-sm font-semibold bg-blue-800 hover:bg-blue-900 text-white rounded-lg cursor-pointer"
              >
                View 5-Step Progress Tracker
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                1. Upload Prepared File (PDF, DOCX, JPG, or PNG)
              </label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-700 rounded-lg p-5 bg-slate-50/80 cursor-pointer transition-colors">
                <FileUp className="w-7 h-7 text-blue-800 mb-2" />
                <span className="text-sm font-semibold text-slate-800 text-center">
                  {file ? file.name : 'Click to browse prepared file'}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Prepare your document externally—no templates inside the app
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label htmlFor="doc-title" className="block text-sm font-semibold text-slate-800 mb-1">
                2. Document Title
              </label>
              <input
                id="doc-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  docType === 'accomplishment'
                    ? 'e.g., Q3 Science Club Accomplishment Report'
                    : 'e.g., Campus Clean-Up Drive Activity Proposal'
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="doc-cat" className="block text-sm font-semibold text-slate-800 mb-1">
                  Category
                </label>
                <select
                  id="doc-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="doc-date" className="block text-sm font-semibold text-slate-800 mb-1">
                  Document Date
                </label>
                <input
                  id="doc-date"
                  type="date"
                  required
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
            </div>

            {docType === 'accomplishment' && (
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  DepEd Core Value Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CORE_VALUES.map((cv) => (
                    <button
                      key={cv}
                      type="button"
                      onClick={() => setCoreValue(cv)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer text-center ${
                        coreValue === cv
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {cv}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentUser.role !== 'organization' && (
              <div>
                <label htmlFor="doc-org" className="block text-sm font-semibold text-slate-800 mb-1">
                  Author / Club Name (Optional)
                </label>
                <input
                  id="doc-org"
                  type="text"
                  value={organizationOverride}
                  onChange={(e) => setOrganizationOverride(e.target.value)}
                  placeholder={`Default: ${currentUser.positionOrClub}`}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>
            )}

            <div>
              <label htmlFor="doc-purpose" className="block text-sm font-semibold text-slate-800 mb-1">
                Purpose / Short Summary
              </label>
              <textarea
                id="doc-purpose"
                rows={2}
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Briefly state what this submission covers..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-semibold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : `Submit ${moduleLabel}`}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
