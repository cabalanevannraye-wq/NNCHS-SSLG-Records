import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Eye,
  FilePlus2,
  FolderOpen,
  Mail,
  Search,
  Shield,
} from 'lucide-react';
import type {
  DirectoryEntry,
  DocumentModuleType,
  SSLGDocument,
  UserAccount,
} from '../types.ts';
import { StageBadge, UserAvatar } from './SSLGCrest.tsx';

interface DirectoryViewProps {
  directory: DirectoryEntry[];
  documents: SSLGDocument[];
  currentUser: UserAccount;
  initialSelectedUserId?: string | null;
  onOpenDocTracker: (doc: SSLGDocument) => void;
  onOpenSubmitModal: (docType: DocumentModuleType) => void;
  onPreviewFile: (doc: SSLGDocument) => void;
}

export function DirectoryView({
  directory,
  documents,
  currentUser,
  initialSelectedUserId,
  onOpenDocTracker,
  onOpenSubmitModal,
  onPreviewFile,
}: DirectoryViewProps) {
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'organization' | 'officers'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    initialSelectedUserId || null
  );

  useEffect(() => {
    if (initialSelectedUserId) {
      setSelectedUserId(initialSelectedUserId);
    }
  }, [initialSelectedUserId]);

  const filteredDirectory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return directory.filter((entry) => {
      if (roleFilter === 'organization' && entry.role !== 'organization') return false;
      if (roleFilter === 'officers' && entry.role === 'organization') return false;
      if (!q) return true;
      return (
        entry.positionOrClub.toLowerCase().includes(q) ||
        entry.fullName.toLowerCase().includes(q) ||
        entry.department.toLowerCase().includes(q) ||
        entry.email.toLowerCase().includes(q)
      );
    });
  }, [directory, roleFilter, search]);

  const selectedEntry = useMemo(() => {
    return (
      directory.find((d) => d.userId === selectedUserId) ||
      filteredDirectory[0] ||
      directory[0] ||
      null
    );
  }, [directory, filteredDirectory, selectedUserId]);

  const selectedClubDocs = useMemo(() => {
    if (!selectedEntry) return [];
    return documents.filter(
      (doc) =>
        doc.submittedByUserId === selectedEntry.userId ||
        doc.organizationName.toLowerCase() === selectedEntry.positionOrClub.toLowerCase()
    );
  }, [documents, selectedEntry]);

  const canInspectSelectedFiles =
    selectedEntry &&
    (currentUser.role !== 'organization' ||
      selectedEntry.userId === currentUser.id ||
      selectedEntry.positionOrClub.toLowerCase() === currentUser.positionOrClub.toLowerCase());

  const clubCount = directory.filter((d) => d.role === 'organization').length;
  const officerCount = directory.filter((d) => d.role !== 'organization').length;

  return (
    <div className="space-y-5">
      {/* Directory Header & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Club &amp; Organization Directory
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Browse registered school clubs, organizations, and SSLG officer desks along with their document tallies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                ['ALL', `All (${directory.length})`],
                ['organization', `Clubs & Orgs (${clubCount})`],
                ['officers', `SSLG Officers (${officerCount})`],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setRoleFilter(val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  roleFilter === val
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search club, officer, dept..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Directory Cards */}
        <div className="lg:col-span-5 space-y-3">
          {filteredDirectory.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              No clubs or accounts match your search.
            </div>
          ) : (
            filteredDirectory.map((entry) => {
              const isSelected = selectedEntry?.userId === entry.userId;
              const isOrg = entry.role === 'organization';
              return (
                <button
                  key={entry.userId}
                  type="button"
                  onClick={() => setSelectedUserId(entry.userId)}
                  className={`w-full text-left bg-white border rounded-xl p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-blue-700 ring-1 ring-blue-700 bg-blue-50/30'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <UserAvatar
                      fullName={entry.fullName}
                      avatarDataUrl={entry.avatarDataUrl}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {entry.positionOrClub}
                        </p>
                        <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap shrink-0">
                          {isOrg ? 'Club / Org' : entry.role === 'admin' ? 'Admin' : 'SSLG Officer'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-0.5">
                        {entry.fullName} · {entry.department}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">Passed: </span>
                          <strong className="text-slate-900 tabular-nums">{entry.totalPassed}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Ongoing: </span>
                          <strong className="text-amber-800 tabular-nums">{entry.ongoingCount}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Archived: </span>
                          <strong className="text-emerald-800 tabular-nums">
                            {entry.completedCount}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: Selected Club / Org Folder & Records */}
        <div className="lg:col-span-7">
          {!selectedEntry ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              Select a club or organization on the left to open its directory folder.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Organization Profile Header */}
              <div className="p-6 border-b border-slate-200 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <UserAvatar
                      fullName={selectedEntry.fullName}
                      avatarDataUrl={selectedEntry.avatarDataUrl}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-800">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>
                          {selectedEntry.role === 'organization'
                            ? 'School Club / Organization'
                            : selectedEntry.role === 'admin'
                            ? 'SSLG President (Admin)'
                            : 'SSLG Officer Desk'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 truncate mt-0.5">
                        {selectedEntry.positionOrClub}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                        <span>
                          Representative:{' '}
                          <strong className="text-slate-900">{selectedEntry.fullName}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{selectedEntry.department}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{selectedEntry.email}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {(selectedEntry.userId === currentUser.id ||
                    currentUser.role !== 'organization') && (
                    <button
                      type="button"
                      onClick={() => onOpenSubmitModal('general')}
                      className="px-3.5 py-2 text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>New Submission</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-[11px] font-medium text-slate-500">Total Passed</p>
                    <p className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                      {selectedEntry.totalPassed}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-[11px] font-medium text-slate-500">Ongoing (S1–S4)</p>
                    <p className="text-lg font-bold text-amber-800 tabular-nums mt-0.5">
                      {selectedEntry.ongoingCount}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-[11px] font-medium text-slate-500">Completed (S5)</p>
                    <p className="text-lg font-bold text-emerald-800 tabular-nums mt-0.5">
                      {selectedEntry.completedCount}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-[11px] font-medium text-slate-500">Accomplishment Reports</p>
                    <p className="text-lg font-bold text-blue-900 tabular-nums mt-0.5">
                      {selectedEntry.accomplishmentCount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Club Folder Documents */}
              <div className="p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-blue-800" />
                    <span>Submitted Documents Folder</span>
                  </h4>
                  {selectedEntry.latestDocumentDate && (
                    <span className="text-xs text-slate-500 tabular-nums">
                      Latest: {selectedEntry.latestDocumentDate}
                    </span>
                  )}
                </div>

                {!canInspectSelectedFiles ? (
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                    <Shield className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-800">
                      Private Organization Folder
                    </p>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Summary tallies ({selectedEntry.totalPassed} passed ·{' '}
                      {selectedEntry.ongoingCount} ongoing) are public in the directory. Individual
                      uploaded files are visible only to {selectedEntry.positionOrClub} and SSLG
                      Officers / President.
                    </p>
                  </div>
                ) : selectedClubDocs.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">
                    No documents submitted under {selectedEntry.positionOrClub} yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {selectedClubDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono-code font-bold text-blue-900">
                              {doc.controlNumber || 'Pending Control No.'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{doc.category}</span>
                            {doc.coreValue && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-blue-800">
                                  {doc.coreValue}
                                </span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{doc.documentDate}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">
                            {doc.title}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <StageBadge stage={doc.currentStage} />
                          <button
                            type="button"
                            onClick={() => onPreviewFile(doc)}
                            title="Preview File"
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDocTracker(doc)}
                            className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <span>Track</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
