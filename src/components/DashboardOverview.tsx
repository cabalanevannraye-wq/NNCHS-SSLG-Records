import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Building2,
  Camera,
  FileText,
  FileUp,
  ListOrdered,
  PenTool,
  Tag,
  Trash2,
  Trophy,
} from 'lucide-react';
import { firebaseService } from '../lib/firebaseService.ts';
import type {
  DocumentModuleType,
  LeaderboardEntry,
  SSLGDocument,
  UserAccount,
} from '../types.ts';
import {
  StageBadge,
  UserAvatar,
  resizeImageFileToDataUrl,
} from './SSLGCrest.tsx';

interface DashboardOverviewProps {
  documents: SSLGDocument[];
  leaderboard: LeaderboardEntry[];
  currentUser: UserAccount;
  onUserUpdated: (user: UserAccount) => void;
  onOpenSubmitModal: (docType: DocumentModuleType) => void;
  onOpenDocTracker: (doc: SSLGDocument) => void;
  onNavigateTab: (
    tab:
      | 'general'
      | 'accomplishments'
      | 'register'
      | 'directory'
      | 'compilations'
      | 'hardcopy'
      | 'accounts'
  ) => void;
  onOpenDirectory: (userId?: string) => void;
  onPrintEartag: (doc: SSLGDocument) => void;
}

export function DashboardOverview({
  documents,
  leaderboard,
  currentUser,
  onUserUpdated,
  onOpenSubmitModal,
  onOpenDocTracker,
  onNavigateTab,
  onOpenDirectory,
  onPrintEartag,
}: DashboardOverviewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const generalDocs = documents.filter((d) => d.docType === 'general');
  const accomplishmentDocs = documents.filter((d) => d.docType === 'accomplishment');
  const awaitingEsign = documents.filter((d) => d.currentStage === 1 || d.currentStage === 2);
  const stage5Count = documents.filter((d) => d.currentStage === 5).length;
  const recentDocs = documents.slice(0, 6);

  const roleHeadline =
    currentUser.role === 'admin'
      ? 'SSLG President · System Administrator'
      : currentUser.role === 'officer'
      ? `${currentUser.positionOrClub} · Officer Desk`
      : `${currentUser.positionOrClub} · Organization Portal`;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError('');
    setAvatarBusy(true);
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 256);
      const updated = await firebaseService.updateMyAvatar(currentUser, dataUrl);
      onUserUpdated(updated);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to update profile picture.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError('');
    setAvatarBusy(true);
    try {
      const updated = await firebaseService.updateMyAvatar(currentUser, null);
      onUserUpdated(updated);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to remove profile picture.');
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary Action Strip with Account Profile Photo Control */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            <UserAvatar
              fullName={currentUser.fullName}
              avatarDataUrl={currentUser.avatarDataUrl}
              size="xl"
            />
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => fileInputRef.current?.click()}
              title="Set or change profile picture"
              aria-label="Set or change profile picture"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 hover:bg-blue-800 text-white border-2 border-white flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-60"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold text-blue-800">{roleHeadline}</p>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 truncate">
              Welcome, {currentUser.fullName}
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Track General Documents and Accomplishment Reports across the 5-step routing pipeline.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                disabled={avatarBusy}
                onClick={() => fileInputRef.current?.click()}
                className="font-semibold text-blue-800 hover:underline cursor-pointer disabled:opacity-50"
              >
                {avatarBusy
                  ? 'Saving photo...'
                  : currentUser.avatarDataUrl
                  ? 'Change profile picture'
                  : 'Set profile picture'}
              </button>
              {currentUser.avatarDataUrl && (
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={handleRemoveAvatar}
                  className="font-medium text-slate-500 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove photo</span>
                </button>
              )}
              {avatarError && <span className="text-rose-700 font-medium">{avatarError}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onOpenSubmitModal('general')}
            className="px-4 py-2.5 text-sm font-bold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <FileUp className="w-4 h-4" />
            <span>Submit General Doc</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenSubmitModal('accomplishment')}
            className="px-4 py-2.5 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Award className="w-4 h-4" />
            <span>Submit Accomplishment Report</span>
          </button>
        </div>
      </div>

      {/* 4-Column Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>General Documents</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {generalDocs.length}
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('general')}
            className="text-xs font-semibold text-blue-800 hover:underline mt-2 cursor-pointer"
          >
            Open General Docs →
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Accomplishment Reports</span>
            <Award className="w-4 h-4 text-blue-700" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {accomplishmentDocs.length}
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('accomplishments')}
            className="text-xs font-semibold text-blue-800 hover:underline mt-2 cursor-pointer"
          >
            Open Accomplishment Reports →
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Awaiting E-Signature (S1–S2)</span>
            <PenTool className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800 mt-2 tabular-nums">
            {awaitingEsign.length}
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('register')}
            className="text-xs font-semibold text-blue-800 hover:underline mt-2 cursor-pointer"
          >
            View Register →
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Stage 5 Archived Scans</span>
            <BookOpenCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-bold text-emerald-800 mt-2 tabular-nums">
            {stage5Count}
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('hardcopy')}
            className="text-xs font-semibold text-blue-800 hover:underline mt-2 cursor-pointer"
          >
            1-Click Year-End Book →
          </button>
        </div>
      </div>

      {/* Contributor Leaderboard */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Top Contributors Leaderboard
              </h3>
              <p className="text-xs text-slate-500">
                Ranked per account by total documents passed and ongoing submissions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenDirectory()}
            className="text-xs font-semibold text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Club &amp; Org Directory →</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6 w-16">Rank</th>
                <th className="py-3 px-4">Account / Club</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Documents Passed</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Ongoing (S1–S4)</th>
                <th className="py-3 px-6 text-right whitespace-nowrap">Completed (S5)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No contributor data available yet.
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const isSelf = entry.userId === currentUser.id;
                  return (
                    <tr
                      key={entry.userId}
                      onClick={() => onOpenDirectory(entry.userId)}
                      className={`cursor-pointer transition-colors ${
                        isSelf ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-6 font-mono-code font-bold tabular-nums whitespace-nowrap">
                        <span
                          className={
                            rank === 1
                              ? 'text-amber-700'
                              : rank === 2
                              ? 'text-slate-700'
                              : rank === 3
                              ? 'text-amber-900'
                              : 'text-slate-400'
                          }
                        >
                          #{rank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            fullName={entry.fullName}
                            avatarDataUrl={entry.avatarDataUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {entry.positionOrClub}
                              {isSelf && (
                                <span className="ml-2 text-[11px] font-semibold text-blue-800">
                                  (You)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {entry.fullName} · {entry.department}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-950 tabular-nums">
                        {entry.totalPassed}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-amber-800 tabular-nums">
                        {entry.ongoingCount}
                      </td>
                      <td className="py-3.5 px-6 text-right font-semibold text-emerald-800 tabular-nums">
                        {entry.completedCount}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stage 1 & 2 Queue needing E-Signature */}
      {awaitingEsign.length > 0 && (
        <div className="bg-white border border-amber-300 rounded-xl overflow-hidden">
          <div className="px-6 py-3.5 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 text-amber-800" />
              <h3 className="text-sm font-bold text-amber-950">
                Pending Stage 2 Electronic Signature ({awaitingEsign.length})
              </h3>
            </div>
            <span className="text-xs text-amber-800">
              Signing issues the Control Number &amp; unlocks Eartag
            </span>
          </div>
          <div className="divide-y divide-slate-200">
            {awaitingEsign.map((doc) => (
              <div
                key={doc.id}
                className="p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-blue-900">
                      {doc.docType === 'accomplishment' ? 'Accomplishment Report' : 'General Doc'}
                    </span>
                    <span>·</span>
                    <span>{doc.organizationName}</span>
                    <span>·</span>
                    <span>{doc.category}</span>
                    {doc.coreValue && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-blue-800">{doc.coreValue}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {doc.title}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <StageBadge stage={doc.currentStage} />
                  <button
                    type="button"
                    onClick={() => onOpenDocTracker(doc)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <span>Open Tracker</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Records Across Both Modules */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Recent Submissions &amp; Progress</h3>
          <button
            type="button"
            onClick={() => onNavigateTab('register')}
            className="text-xs font-semibold text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Master Control Register →</span>
          </button>
        </div>
        <div className="divide-y divide-slate-200">
          {recentDocs.map((doc) => (
            <div
              key={doc.id}
              className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono-code font-bold text-blue-900">
                    {doc.controlNumber || 'Pending Control No.'}
                  </span>
                  <span>·</span>
                  <span>
                    {doc.docType === 'accomplishment' ? 'Accomplishment Report' : 'General Doc'}
                  </span>
                  <span>·</span>
                  <span>{doc.organizationName}</span>
                  {doc.coreValue && (
                    <>
                      <span>·</span>
                      <span className="font-semibold text-blue-800">{doc.coreValue}</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDocTracker(doc)}
                  className="text-sm font-semibold text-slate-900 hover:text-blue-800 text-left mt-0.5 cursor-pointer"
                >
                  {doc.title}
                </button>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <StageBadge stage={doc.currentStage} />
                {doc.currentStage >= 3 && doc.controlNumber && (
                  <button
                    type="button"
                    onClick={() => onPrintEartag(doc)}
                    className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Eartag</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
