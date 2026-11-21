import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  BookOpenCheck,
  Building2,
  Camera,
  FilePlus2,
  FileStack,
  FileText,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Users,
  X,
} from 'lucide-react';
import { AdminAccountsView } from './components/AdminAccountsView.tsx';
import {
  CompilationPrintableSheet,
  CompilationsView,
} from './components/CompilationsView.tsx';
import { ControlRegisterView } from './components/ControlRegisterView.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { DirectoryView } from './components/DirectoryView.tsx';
import { DocumentTrackerView } from './components/DocumentTrackerView.tsx';
import { EartagModal, EartagPrintableSheet } from './components/EartagModal.tsx';
import { ESignModal } from './components/ESignModal.tsx';
import { FilePreviewModal } from './components/FilePreviewModal.tsx';
import { LoginView } from './components/LoginView.tsx';
import { PassDocumentModal } from './components/PassDocumentModal.tsx';
import {
  SSLGCrest,
  UserAvatar,
  resizeImageFileToDataUrl,
} from './components/SSLGCrest.tsx';
import { SignedHardcopyArchiveView } from './components/SignedHardcopyArchiveView.tsx';
import {
  TransmittalPrintableSheet,
  TransmittalSlipModal,
} from './components/TransmittalSlipModal.tsx';
import {
  api,
  getDocumentFileUrl,
  getHardcopyFileUrl,
  getStoredToken,
  setStoredToken,
} from './lib/api.ts';
import type {
  DirectoryEntry,
  DocumentModuleType,
  LeaderboardEntry,
  SSLGDocument,
  SystemSettings,
  UserAccount,
} from './types.ts';

type NavTab =
  | 'overview'
  | 'general'
  | 'accomplishments'
  | 'register'
  | 'directory'
  | 'compilations'
  | 'hardcopy'
  | 'accounts';

type PrintPayload =
  | { type: 'eartag'; doc: SSLGDocument }
  | {
      type: 'transmittal';
      docs: SSLGDocument[];
      fromLabel: string;
      toLabel: string;
    }
  | {
      type: 'compilation';
      docs: SSLGDocument[];
      periodLabel: string;
      categoryLabel: string;
    }
  | null;

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    organizationHeader: 'Supreme Secondary Learner Government',
    schoolYear: '2026-2027',
    generalPrefix: 'SSLG-2026',
    generalNextSequence: 1,
    accomplishmentPrefix: 'AR-2026',
    accomplishmentNextSequence: 1,
  });
  const [documents, setDocuments] = useState<SSLGDocument[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDirectoryUserId, setSelectedDirectoryUserId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarAvatarInputRef = useRef<HTMLInputElement | null>(null);

  // Modals
  const [passModalDocType, setPassModalDocType] = useState<DocumentModuleType | null>(null);
  const [esignDoc, setEsignDoc] = useState<SSLGDocument | null>(null);
  const [eartagDoc, setEartagDoc] = useState<SSLGDocument | null>(null);
  const [transmittalModal, setTransmittalModal] = useState<{
    docs: SSLGDocument[];
    fromLabel: string;
    toLabel: string;
  } | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    title: string;
    subtitle?: string;
    fileUrl: string;
    downloadUrl?: string;
    mimeType?: string;
  } | null>(null);

  // Print-only state
  const [printPayload, setPrintPayload] = useState<PrintPayload>(null);

  const refreshRankingsAndDirectory = async () => {
    try {
      const [lb, dir] = await Promise.all([api.getLeaderboard(), api.getDirectory()]);
      setLeaderboard(lb);
      setDirectory(dir);
    } catch {
      // ignore background refresh error
    }
  };

  const loadWorkspaceData = async () => {
    const [docs, lb, dir] = await Promise.all([
      api.getDocuments(),
      api.getLeaderboard(),
      api.getDirectory(),
    ]);
    setDocuments(docs);
    setLeaderboard(lb);
    setDirectory(dir);
    if (docs.length > 0 && !selectedDocId) {
      setSelectedDocId(docs[0].id);
    }
  };

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    api
      .me()
      .then(async (res) => {
        setCurrentUser(res.user);
        setSettings(res.settings);
        await loadWorkspaceData();
      })
      .catch(() => {
        setStoredToken(null);
      })
      .finally(() => setInitializing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoginSuccess = async (
    token: string,
    user: UserAccount,
    sysSettings: SystemSettings
  ) => {
    setStoredToken(token);
    setCurrentUser(user);
    setSettings(sysSettings);
    setActiveTab('overview');
    await loadWorkspaceData();
  };

  const handleLogout = () => {
    setStoredToken(null);
    setCurrentUser(null);
    setDocuments([]);
    setLeaderboard([]);
    setDirectory([]);
    setSelectedDocId(null);
    setSelectedDirectoryUserId(null);
  };

  const handleUserUpdated = (updatedUser: UserAccount) => {
    setCurrentUser(updatedUser);
    void refreshRankingsAndDirectory();
  };

  const handleSidebarAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 256);
      const updated = await api.updateMyAvatar(dataUrl);
      handleUserUpdated(updated);
    } catch {
      // ignore invalid file silently from quick sidebar trigger
    }
  };

  const handleDocumentCreated = (doc: SSLGDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    setSelectedDocId(doc.id);
    void refreshRankingsAndDirectory();
  };

  const handleDocumentUpdated = (updated: SSLGDocument) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    void refreshRankingsAndDirectory();
  };

  const handleDocumentDeleted = (deletedId: string) => {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== deletedId);
      if (selectedDocId === deletedId) {
        setSelectedDocId(next[0]?.id ?? null);
      }
      return next;
    });
    void refreshRankingsAndDirectory();
  };

  const openDocInTracker = (doc: SSLGDocument) => {
    setSelectedDocId(doc.id);
    setActiveTab(doc.docType === 'accomplishment' ? 'accomplishments' : 'general');
  };

  const openFilePreview = (doc: SSLGDocument) => {
    setPreviewModal({
      title: `${doc.controlNumber || 'Pending Control No.'} — ${doc.title}`,
      subtitle: `${doc.organizationName} · ${doc.category}`,
      fileUrl: getDocumentFileUrl(doc.id),
      downloadUrl: getDocumentFileUrl(doc.id, { download: true }),
      mimeType: doc.signedFilePath ? 'application/pdf' : doc.fileMimeType,
    });
  };

  const openHardcopyPreview = (doc: SSLGDocument) => {
    setPreviewModal({
      title: `Hardcopy Scan — ${doc.controlNumber || doc.title}`,
      subtitle: `${doc.title} · Signatories: ${doc.hardcopyScan?.wetInkSignatories || 'Verified'}`,
      fileUrl: getHardcopyFileUrl(doc.id),
      downloadUrl: getHardcopyFileUrl(doc.id, true),
      mimeType: doc.hardcopyScan?.fileMimeType,
    });
  };

  const triggerPrint = (payload: PrintPayload) => {
    setPrintPayload(payload);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <SSLGCrest className="w-12 h-12 mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading SSLG Records Portal...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onSuccess={handleLoginSuccess} />;
  }

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: typeof LayoutDashboard;
    adminOnly?: boolean;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'general', label: 'General Documents', icon: FileText },
    { id: 'accomplishments', label: 'Accomplishment Reports', icon: Award },
    { id: 'register', label: 'Control Register', icon: ListOrdered },
    { id: 'directory', label: 'Club & Org Directory', icon: Building2 },
    { id: 'compilations', label: 'Compilations & Reports', icon: FileStack },
    { id: 'hardcopy', label: 'Signed Hardcopy Scans', icon: BookOpenCheck },
    { id: 'accounts', label: 'Accounts & Settings', icon: Users, adminOnly: true },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || currentUser.role === 'admin');
  const activeTabTitle = visibleNavItems.find((i) => i.id === activeTab)?.label || 'Overview';
  const defaultSubmitType: DocumentModuleType =
    activeTab === 'accomplishments' ? 'accomplishment' : 'general';

  return (
    <>
      {/* Interactive Application Shell */}
      <div className="no-print min-h-screen bg-slate-50 flex flex-col lg:flex-row">
        {/* Mobile Sidebar Backdrop */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col justify-between transition-transform lg:static lg:translate-x-0 shrink-0 ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Brand Lockup */}
            <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <SSLGCrest className="w-9 h-9 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">SSLG Records</p>
                  <p className="text-[11px] text-slate-400 truncate">SY {settings.schoolYear}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="lg:hidden p-1.5 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-800 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Account Card & Sign Out */}
          <div className="p-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <UserAvatar
                  fullName={currentUser.fullName}
                  avatarDataUrl={currentUser.avatarDataUrl}
                  size="sm"
                />
                <button
                  type="button"
                  onClick={() => sidebarAvatarInputRef.current?.click()}
                  title="Update profile picture"
                  aria-label="Update profile picture"
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-700 hover:bg-blue-600 text-white border border-slate-900 flex items-center justify-center cursor-pointer"
                >
                  <Camera className="w-2.5 h-2.5" />
                </button>
                <input
                  ref={sidebarAvatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSidebarAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{currentUser.fullName}</p>
                <p className="text-[11px] text-amber-300 truncate">{currentUser.positionOrClub}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {activeTabTitle}
                </h1>
                <p className="text-xs text-slate-500 truncate">{settings.organizationHeader}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setPassModalDocType(defaultSubmitType)}
                className="px-4 py-2 text-sm font-semibold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>
                  {defaultSubmitType === 'accomplishment'
                    ? 'Submit Accomplishment Report'
                    : 'Submit General Doc'}
                </span>
              </button>
            </div>
          </header>

          {/* Main Content Viewport */}
          <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
            {activeTab === 'overview' && (
              <DashboardOverview
                documents={documents}
                leaderboard={leaderboard}
                currentUser={currentUser}
                onUserUpdated={handleUserUpdated}
                onOpenSubmitModal={(docType) => setPassModalDocType(docType)}
                onOpenDocTracker={openDocInTracker}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenDirectory={(userId) => {
                  setSelectedDirectoryUserId(userId ?? null);
                  setActiveTab('directory');
                }}
                onPrintEartag={(doc) => setEartagDoc(doc)}
              />
            )}

            {activeTab === 'general' && (
              <DocumentTrackerView
                docType="general"
                documents={documents}
                currentUser={currentUser}
                selectedDocId={selectedDocId}
                onSelectDoc={(id) => setSelectedDocId(id)}
                onOpenSubmitModal={() => setPassModalDocType('general')}
                onDocumentUpdated={handleDocumentUpdated}
                onDocumentDeleted={handleDocumentDeleted}
                onOpenESign={(doc) => setEsignDoc(doc)}
                onOpenEartag={(doc) => setEartagDoc(doc)}
                onOpenTransmittalSlip={(docs, fromLabel, toLabel) =>
                  setTransmittalModal({ docs, fromLabel, toLabel })
                }
                onPreviewFile={openFilePreview}
                onPreviewHardcopy={openHardcopyPreview}
              />
            )}

            {activeTab === 'accomplishments' && (
              <DocumentTrackerView
                docType="accomplishment"
                documents={documents}
                currentUser={currentUser}
                selectedDocId={selectedDocId}
                onSelectDoc={(id) => setSelectedDocId(id)}
                onOpenSubmitModal={() => setPassModalDocType('accomplishment')}
                onDocumentUpdated={handleDocumentUpdated}
                onDocumentDeleted={handleDocumentDeleted}
                onOpenESign={(doc) => setEsignDoc(doc)}
                onOpenEartag={(doc) => setEartagDoc(doc)}
                onOpenTransmittalSlip={(docs, fromLabel, toLabel) =>
                  setTransmittalModal({ docs, fromLabel, toLabel })
                }
                onPreviewFile={openFilePreview}
                onPreviewHardcopy={openHardcopyPreview}
              />
            )}

            {activeTab === 'register' && (
              <ControlRegisterView
                documents={documents}
                currentUser={currentUser}
                onSelectTrack={openDocInTracker}
                onPrintEartag={(doc) => setEartagDoc(doc)}
                onPrintBatchTransmittal={(docs) =>
                  setTransmittalModal({
                    docs,
                    fromLabel: currentUser.positionOrClub,
                    toLabel: 'Receiving Officer / SSLG Records',
                  })
                }
                onPreviewFile={openFilePreview}
                onDocumentUpdated={handleDocumentUpdated}
              />
            )}

            {activeTab === 'directory' && (
              <DirectoryView
                directory={directory}
                documents={documents}
                currentUser={currentUser}
                initialSelectedUserId={selectedDirectoryUserId}
                onOpenDocTracker={openDocInTracker}
                onOpenSubmitModal={(docType) => setPassModalDocType(docType)}
                onPreviewFile={openFilePreview}
              />
            )}

            {activeTab === 'compilations' && (
              <CompilationsView
                documents={documents}
                settings={settings}
                onPrintCompilationSheet={({ documents: docs, periodLabel, categoryLabel }) =>
                  triggerPrint({
                    type: 'compilation',
                    docs,
                    periodLabel,
                    categoryLabel,
                  })
                }
                onOpenCompiledPdf={(pdfUrl, title) =>
                  setPreviewModal({
                    title,
                    subtitle: 'Merged PDF Binder with Formal Cover Sheet & Master Index',
                    fileUrl: pdfUrl,
                    downloadUrl: pdfUrl,
                    mimeType: 'application/pdf',
                  })
                }
              />
            )}

            {activeTab === 'hardcopy' && (
              <SignedHardcopyArchiveView
                documents={documents}
                currentUser={currentUser}
                settings={settings}
                onDocumentUpdated={handleDocumentUpdated}
                onOpenYearEndPdf={(url, title) =>
                  setPreviewModal({
                    title,
                    subtitle: 'Auto-numbered Table of Contents + All Stage 5 Signed Scans',
                    fileUrl: url,
                    downloadUrl: url,
                    mimeType: 'application/pdf',
                  })
                }
                onPreviewHardcopy={openHardcopyPreview}
                onPrintEartag={(doc) => setEartagDoc(doc)}
              />
            )}

            {activeTab === 'accounts' && currentUser.role === 'admin' && (
              <AdminAccountsView
                currentUser={currentUser}
                settings={settings}
                onSettingsUpdated={(updated) => setSettings(updated)}
              />
            )}
          </main>
        </div>

        {/* Modals */}
        {passModalDocType && (
          <PassDocumentModal
            docType={passModalDocType}
            currentUser={currentUser}
            onClose={() => setPassModalDocType(null)}
            onCreated={handleDocumentCreated}
            onViewTracker={openDocInTracker}
          />
        )}

        {esignDoc && (
          <ESignModal
            doc={esignDoc}
            currentUser={currentUser}
            onClose={() => setEsignDoc(null)}
            onSigned={(updated) => {
              handleDocumentUpdated(updated);
              setEsignDoc(null);
            }}
          />
        )}

        {eartagDoc && (
          <EartagModal
            doc={eartagDoc}
            settings={settings}
            onClose={() => setEartagDoc(null)}
            onTriggerPrint={() => triggerPrint({ type: 'eartag', doc: eartagDoc })}
          />
        )}

        {transmittalModal && (
          <TransmittalSlipModal
            documents={transmittalModal.docs}
            settings={settings}
            fromLabel={transmittalModal.fromLabel}
            toLabel={transmittalModal.toLabel}
            onClose={() => setTransmittalModal(null)}
            onTriggerPrint={() =>
              triggerPrint({
                type: 'transmittal',
                docs: transmittalModal.docs,
                fromLabel: transmittalModal.fromLabel,
                toLabel: transmittalModal.toLabel,
              })
            }
          />
        )}

        {previewModal && (
          <FilePreviewModal
            title={previewModal.title}
            subtitle={previewModal.subtitle}
            fileUrl={previewModal.fileUrl}
            downloadUrl={previewModal.downloadUrl}
            mimeType={previewModal.mimeType}
            onClose={() => setPreviewModal(null)}
          />
        )}
      </div>

      {/* Dedicated @media print surface */}
      <div className="print-only">
        {printPayload?.type === 'eartag' && (
          <EartagPrintableSheet doc={printPayload.doc} settings={settings} />
        )}
        {printPayload?.type === 'transmittal' && (
          <TransmittalPrintableSheet
            documents={printPayload.docs}
            settings={settings}
            fromLabel={printPayload.fromLabel}
            toLabel={printPayload.toLabel}
          />
        )}
        {printPayload?.type === 'compilation' && (
          <CompilationPrintableSheet
            documents={printPayload.docs}
            settings={settings}
            periodLabel={printPayload.periodLabel}
            categoryLabel={printPayload.categoryLabel}
          />
        )}
      </div>
    </>
  );
}
