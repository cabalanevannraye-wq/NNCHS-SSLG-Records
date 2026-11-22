import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  Award,
  BookOpenCheck,
  Building2,
  Camera,
  CheckCircle2,
  FilePlus2,
  FileStack,
  FileText,
  Globe,
  HardDrive,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Megaphone,
  Menu,
  Printer,
  ShieldAlert,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  auth,
  clearGoogleDriveAccessToken,
  connectGoogleDriveWithPopup,
  getGoogleDriveAccessToken,
} from './firebase.ts';
import { AdminAccountsView } from './components/AdminAccountsView.tsx';
import {
  CompilationPrintableSheet,
  CompilationsView,
} from './components/CompilationsView.tsx';
import { ControlRegisterView } from './components/ControlRegisterView.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { DirectoryView } from './components/DirectoryView.tsx';
import {
  DocumentLetterheadModal,
  type LetterheadDocumentPayload,
} from './components/DocumentLetterheadModal.tsx';
import { DocumentTrackerView } from './components/DocumentTrackerView.tsx';
import { EartagModal, EartagPrintableSheet } from './components/EartagModal.tsx';
import { ESignModal } from './components/ESignModal.tsx';
import { FilePreviewModal } from './components/FilePreviewModal.tsx';
import { GoogleDriveView } from './components/GoogleDriveView.tsx';
import { LoginView } from './components/LoginView.tsx';
import { PassDocumentModal } from './components/PassDocumentModal.tsx';
import {
  SSLGCrest,
  UserAvatar,
  resizeImageFileToDataUrl,
} from './components/SSLGCrest.tsx';
import { SignedHardcopyArchiveView } from './components/SignedHardcopyArchiveView.tsx';
import {
  ThemeToggle,
  applyThemeToDocument,
  getInitialTheme,
  type ThemeMode,
} from './components/ThemeToggle.tsx';
import {
  TransmittalPrintableSheet,
  TransmittalSlipModal,
} from './components/TransmittalSlipModal.tsx';
import { CalendarAndVerifierSection } from './components/portal/CalendarAndVerifierSection.tsx';
import {
  DirectoriesSection,
  type DirectorySubTab,
} from './components/portal/DirectoriesSection.tsx';
import { LandingSection } from './components/portal/LandingSection.tsx';
import {
  PortalAdminTabs,
  type PortalAdminTabId,
} from './components/portal/PortalAdminTabs.tsx';
import { PublicNavbar, type PortalJumpTarget } from './components/portal/PublicNavbar.tsx';
import {
  ReportingDeskSection,
  type ReportingSubTab,
} from './components/portal/ReportingDeskSection.tsx';
import {
  ServicesPrintingSection,
  type ServicesSubTab,
} from './components/portal/ServicesPrintingSection.tsx';
import {
  TransparencySealSection,
  type TransparencySubTab,
} from './components/portal/TransparencySealSection.tsx';
import { getDocumentFileUrl, getHardcopyFileUrl } from './lib/api.ts';
import {
  buildLeaderboardAndDirectory,
  DEFAULT_SETTINGS,
  firebaseService,
  resolveSignedInUser,
  subscribeWorkspaceData,
} from './lib/firebaseService.ts';
import { downloadDriveFileBlob } from './lib/googleDrive.ts';
import {
  SSLG_ADMIN_SMS_NUMBER,
  loadPortalState,
  loadSmsLogs,
  savePortalState,
  saveSmsLogs,
  type GrievanceTicket,
  type LostFoundItem,
  type PortalSectionId,
  type PortalState,
  type PrintRequestJob,
  type SmsDispatchLog,
} from './lib/portalStore.ts';
import type {
  DocumentModuleType,
  SSLGDocument,
  SystemSettings,
  UserAccount,
} from './types.ts';

type RecordsNavTab =
  | 'overview'
  | 'general'
  | 'accomplishments'
  | 'register'
  | 'directory'
  | 'compilations'
  | 'hardcopy'
  | 'drive'
  | 'accounts';

type HubNavTab = PortalAdminTabId | RecordsNavTab;

type AppScreenMode = 'portal' | 'hub-login' | 'hub';

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

const PORTAL_SECTION_DOM_ID: Record<PortalSectionId, string> = {
  home: 'portal-sec-home',
  directories: 'portal-sec-directories',
  services: 'portal-sec-services',
  news: 'portal-sec-home',
  reporting: 'portal-sec-reporting',
  calendar: 'portal-sec-calendar',
  transparency: 'portal-sec-transparency',
};

export default function App() {
  // Global Theme State
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  // Public Portal Shared State (zero-login persistence synced with Admin Hub)
  const [portalState, setPortalState] = useState<PortalState>(() => loadPortalState());
  const [smsLogs, setSmsLogs] = useState<SmsDispatchLog[]>(() => loadSmsLogs());

  // Navigation & Sub-tab Control
  const [screenMode, setScreenMode] = useState<AppScreenMode>('portal');
  const [activePortalSection, setActivePortalSection] = useState<PortalSectionId>('home');
  const [dirSubTab, setDirSubTab] = useState<DirectorySubTab>('officers');
  const [srvSubTab, setSrvSubTab] = useState<ServicesSubTab>('printing');
  const [repSubTab, setRepSubTab] = useState<ReportingSubTab>('submit');
  const [transSubTab, setTransSubTab] = useState<TransparencySubTab>('legislation');
  const [highlightVerifier, setHighlightVerifier] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Official White Letterhead Modal
  const [letterheadDoc, setLetterheadDoc] = useState<LetterheadDocumentPayload | null>(null);

  // Firebase Auth & Existing Digital Records Hub State
  const [initializing, setInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authBlockState, setAuthBlockState] = useState<{
    status: 'unauthorized' | 'disabled' | 'unverified';
    email: string;
  } | null>(null);

  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [documents, setDocuments] = useState<SSLGDocument[]>([]);
  const [directoryProfiles, setDirectoryProfiles] = useState<UserAccount[]>([]);
  const [contributorStats, setContributorStats] = useState<
    Map<
      string,
      {
        totalPassed: number;
        ongoingCount: number;
        completedCount: number;
        generalCount: number;
        accomplishmentCount: number;
        latestDocumentDate: string | null;
      }
    >
  >(new Map());

  const [activeHubTab, setActiveHubTab] = useState<HubNavTab>('portal-printing');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDirectoryUserId, setSelectedDirectoryUserId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarAvatarInputRef = useRef<HTMLInputElement | null>(null);

  // Records Hub Modals
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
  const [printPayload, setPrintPayload] = useState<PrintPayload>(null);

  const notify = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3600);
  };

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const updatePortal = (updater: (prev: PortalState) => PortalState) => {
    setPortalState((prev) => {
      const next = updater(prev);
      savePortalState(next);
      return next;
    });
  };

  const appendSmsLog = (log: SmsDispatchLog) => {
    setSmsLogs((prev) => {
      const next = [log, ...prev];
      saveSmsLogs(next);
      return next;
    });
  };

  useEffect(() => {
    let unsubWorkspace: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubWorkspace) {
        unsubWorkspace();
        unsubWorkspace = null;
      }

      if (!fbUser) {
        clearGoogleDriveAccessToken();
        setCurrentUser(null);
        setAuthBlockState(null);
        setDocuments([]);
        setDirectoryProfiles([]);
        setContributorStats(new Map());
        setSelectedDocId(null);
        setSelectedDirectoryUserId(null);
        setInitializing(false);
        return;
      }

      setInitializing(true);
      try {
        const result = await resolveSignedInUser(fbUser);
        if (result.status !== 'authorized') {
          setCurrentUser(null);
          setAuthBlockState({ status: result.status, email: result.email });
          setInitializing(false);
          return;
        }

        setAuthBlockState(null);
        setCurrentUser(result.user);
        setSettings(result.settings);
        setScreenMode((prev) => (prev === 'hub-login' ? 'hub' : prev));

        unsubWorkspace = subscribeWorkspaceData(result.user, {
          onSettings: (s) => setSettings(s),
          onDocuments: (docs) => {
            setDocuments(docs);
            setSelectedDocId((prev) => {
              if (prev && docs.some((d) => d.id === prev)) return prev;
              return docs[0]?.id ?? null;
            });
          },
          onDirectoryProfiles: (profiles) => {
            setDirectoryProfiles(profiles);
            const updatedSelf = profiles.find((p) => p.id === result.user.id);
            if (updatedSelf) {
              setCurrentUser((prev) =>
                prev
                  ? {
                      ...prev,
                      fullName: updatedSelf.fullName,
                      role: updatedSelf.role,
                      positionOrClub: updatedSelf.positionOrClub,
                      department: updatedSelf.department,
                      avatarDataUrl: updatedSelf.avatarDataUrl ?? null,
                    }
                  : prev
              );
            }
          },
          onStats: (statsMap) => setContributorStats(statsMap),
        });
      } finally {
        setInitializing(false);
      }
    });

    return () => {
      if (unsubWorkspace) unsubWorkspace();
      unsubAuth();
    };
  }, []);

  const { leaderboard, directory } = useMemo(
    () => buildLeaderboardAndDirectory(directoryProfiles, contributorStats),
    [directoryProfiles, contributorStats]
  );

  // Portal Navigation Helper
  const navigatePortal = (target: PortalJumpTarget) => {
    setScreenMode('portal');
    setActivePortalSection(target.section);
    setHighlightVerifier(target.section === 'calendar' && target.subTab === 'verifier');

    if (target.section === 'directories' && target.subTab) {
      setDirSubTab(target.subTab as DirectorySubTab);
    }
    if (target.section === 'services' && target.subTab) {
      setSrvSubTab(target.subTab as ServicesSubTab);
    }
    if (target.section === 'reporting' && target.subTab) {
      setRepSubTab(target.subTab as ReportingSubTab);
    }
    if (target.section === 'transparency' && target.subTab) {
      setTransSubTab(target.subTab as TransparencySubTab);
    }

    const domId = PORTAL_SECTION_DOM_ID[target.section];
    window.setTimeout(() => {
      const el = document.getElementById(domId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Public Portal Submission Handlers
  const handlePublicPrintJob = (job: PrintRequestJob, smsLog: SmsDispatchLog) => {
    updatePortal((prev) => ({
      ...prev,
      printJobs: [job, ...prev.printJobs],
    }));
    appendSmsLog(smsLog);
    notify(`Print job ${job.jobCode} submitted & SMS alert logged for ${SSLG_ADMIN_SMS_NUMBER}.`);
  };

  const handlePublicLostReport = (item: LostFoundItem) => {
    updatePortal((prev) => ({
      ...prev,
      lostFound: [item, ...prev.lostFound],
    }));
  };

  const handlePublicTicket = (ticket: GrievanceTicket) => {
    updatePortal((prev) => ({
      ...prev,
      tickets: [ticket, ...prev.tickets],
    }));
    notify(`Ticket ${ticket.ticketCode} submitted to NNCHS SSLG Welfare Desk.`);
  };

  // Hub Handlers
  const handleOpenHub = () => {
    if (currentUser) {
      setScreenMode('hub');
    } else {
      setScreenMode('hub-login');
    }
  };

  const handleLogout = async () => {
    clearGoogleDriveAccessToken();
    await signOut(auth);
    setScreenMode('portal');
    notify('SSLG Hub locked and signed out safely.');
  };

  const handleUserUpdated = (updatedUser: UserAccount) => {
    setCurrentUser(updatedUser);
  };

  const handleSidebarAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentUser) return;
    try {
      const dataUrl = await resizeImageFileToDataUrl(file, 256);
      const updated = await firebaseService.updateMyAvatar(currentUser, dataUrl);
      handleUserUpdated(updated);
    } catch {
      // ignore invalid file
    }
  };

  const handleDocumentCreated = (doc: SSLGDocument) => {
    setDocuments((prev) => (prev.some((d) => d.id === doc.id) ? prev : [doc, ...prev]));
    setSelectedDocId(doc.id);
  };

  const handleDocumentUpdated = (updated: SSLGDocument) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleDocumentDeleted = (deletedId: string) => {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== deletedId);
      if (selectedDocId === deletedId) {
        setSelectedDocId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const openDocInTracker = (doc: SSLGDocument) => {
    setSelectedDocId(doc.id);
    setActiveHubTab(doc.docType === 'accomplishment' ? 'accomplishments' : 'general');
  };

  const openFilePreview = async (doc: SSLGDocument) => {
    const activePath = doc.signedFilePath || doc.filePath;
    if (activePath.startsWith('drive:')) {
      const driveId = activePath.slice(6);
      const mime = doc.signedFilePath ? 'application/pdf' : doc.fileMimeType;
      try {
        if (!getGoogleDriveAccessToken()) {
          await connectGoogleDriveWithPopup();
        }
        const { blob, resolvedMimeType } = await downloadDriveFileBlob(driveId, mime);
        const blobUrl = URL.createObjectURL(blob);
        setPreviewModal({
          title: `${doc.controlNumber || 'Pending Control No.'} — ${doc.title}`,
          subtitle: `${doc.organizationName} · ${doc.category} · Google Drive`,
          fileUrl: blobUrl,
          downloadUrl: blobUrl,
          mimeType: resolvedMimeType,
        });
        return;
      } catch {
        // Fallback below
      }
    }

    setPreviewModal({
      title: `${doc.controlNumber || 'Pending Control No.'} — ${doc.title}`,
      subtitle: `${doc.organizationName} · ${doc.category}`,
      fileUrl: getDocumentFileUrl(doc),
      downloadUrl: getDocumentFileUrl(doc, { download: true }),
      mimeType: doc.signedFilePath ? 'application/pdf' : doc.fileMimeType,
    });
  };

  const openHardcopyPreview = async (doc: SSLGDocument) => {
    const scanPath = doc.hardcopyScan?.filePath || '';
    if (scanPath.startsWith('drive:')) {
      const driveId = scanPath.slice(6);
      try {
        if (!getGoogleDriveAccessToken()) {
          await connectGoogleDriveWithPopup();
        }
        const { blob, resolvedMimeType } = await downloadDriveFileBlob(
          driveId,
          doc.hardcopyScan?.fileMimeType
        );
        const blobUrl = URL.createObjectURL(blob);
        setPreviewModal({
          title: `Hardcopy Scan — ${doc.controlNumber || doc.title}`,
          subtitle: `${doc.title} · Signatories: ${doc.hardcopyScan?.wetInkSignatories || 'Verified'} · Google Drive`,
          fileUrl: blobUrl,
          downloadUrl: blobUrl,
          mimeType: resolvedMimeType,
        });
        return;
      } catch {
        // Fallback below
      }
    }

    setPreviewModal({
      title: `Hardcopy Scan — ${doc.controlNumber || doc.title}`,
      subtitle: `${doc.title} · Signatories: ${doc.hardcopyScan?.wetInkSignatories || 'Verified'}`,
      fileUrl: getHardcopyFileUrl(doc),
      downloadUrl: getHardcopyFileUrl(doc, true),
      mimeType: doc.hardcopyScan?.fileMimeType,
    });
  };

  const closePreviewModal = () => {
    if (previewModal?.fileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewModal.fileUrl);
    }
    setPreviewModal(null);
  };

  const triggerPrint = (payload: PrintPayload) => {
    setPrintPayload(payload);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const portalManagementNav: Array<{
    id: PortalAdminTabId;
    label: string;
    icon: typeof Printer;
  }> = [
    { id: 'portal-printing', label: 'Free Printing & SMS Logs', icon: Printer },
    { id: 'portal-grievances', label: 'Grievance & Report Logs', icon: ShieldAlert },
    { id: 'portal-legislation', label: 'Resolutions & Minutes', icon: FileText },
    { id: 'portal-finance', label: 'Financial Ledger', icon: Wallet },
    { id: 'portal-news', label: 'News & Calendar Publisher', icon: Megaphone },
    { id: 'portal-directory', label: 'Directory & ID Manager', icon: Users },
  ];

  const recordsNavItems: Array<{
    id: RecordsNavTab;
    label: string;
    icon: typeof LayoutDashboard;
    adminOnly?: boolean;
  }> = [
    { id: 'overview', label: 'Overview & Leaderboard', icon: LayoutDashboard },
    { id: 'general', label: 'General Documents', icon: FileText },
    { id: 'accomplishments', label: 'Accomplishment Reports', icon: Award },
    { id: 'register', label: 'Control Register', icon: ListOrdered },
    { id: 'directory', label: 'Club & Org Directory', icon: Building2 },
    { id: 'compilations', label: 'Compilations & Reports', icon: FileStack },
    { id: 'hardcopy', label: 'Signed Hardcopy Scans', icon: BookOpenCheck },
    { id: 'drive', label: 'Google Drive', icon: HardDrive },
    { id: 'accounts', label: 'Accounts & Settings', icon: Users, adminOnly: true },
  ];

  const visibleRecordsNav = recordsNavItems.filter(
    (item) => !item.adminOnly || currentUser?.role === 'admin'
  );

  const allHubLabels = [...portalManagementNav, ...visibleRecordsNav];
  const activeHubTitle =
    allHubLabels.find((i) => i.id === activeHubTab)?.label || 'SSLG Governance Hub';
  const defaultSubmitType: DocumentModuleType =
    activeHubTab === 'accomplishments' ? 'accomplishment' : 'general';

  // Render Embedded Login View when requested
  if (screenMode === 'hub-login' && !currentUser) {
    return (
      <LoginView
        authBlockState={authBlockState}
        onClearBlockState={() => setAuthBlockState(null)}
        onReturnToPortal={() => setScreenMode('portal')}
      />
    );
  }

  // Render Authenticated Hub (6 Public-Portal Governance Tabs + Existing Digital Records Vault)
  if (screenMode === 'hub' && currentUser) {
    const isPortalAdminTab = activeHubTab.startsWith('portal-');
    return (
      <>
        <div className="no-print min-h-screen bg-[#f8fafc] dark:bg-[#0b1120] flex flex-col lg:flex-row">
          {mobileNavOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
          )}

          <aside
            className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-100 flex flex-col justify-between transition-transform lg:static lg:translate-x-0 shrink-0 ${
              mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <SSLGCrest className="w-9 h-9 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">NNCHS SSLG Hub</p>
                    <p className="text-[11px] text-amber-300 truncate">SY {settings.schoolYear}</p>
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

              <div className="p-3 space-y-5">
                <div>
                  <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    Public Portal Governance
                  </p>
                  <nav className="space-y-1">
                    {portalManagementNav.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeHubTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveHubTab(item.id);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                            isActive
                              ? 'bg-blue-800 text-white'
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

                <div>
                  <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    5-Stage Records &amp; Routing
                  </p>
                  <nav className="space-y-1">
                    {visibleRecordsNav.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeHubTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveHubTab(item.id);
                            setMobileNavOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                            isActive
                              ? 'bg-blue-800 text-white'
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
              </div>
            </div>

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
                  <p className="text-xs font-semibold text-white truncate">
                    {currentUser.fullName}
                  </p>
                  <p className="text-[11px] text-amber-300 truncate">
                    {currentUser.positionOrClub}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {currentUser.username ? `@${currentUser.username}` : currentUser.email}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScreenMode('portal')}
                  className="py-2 px-2.5 text-xs font-semibold text-slate-100 bg-blue-900/70 hover:bg-blue-800 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public View</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="py-2 px-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Lock Hub</span>
                </button>
              </div>
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="lg:hidden p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                    {activeHubTitle}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {settings.organizationHeader}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <ThemeToggle theme={theme} onToggle={toggleTheme} compact />
                <button
                  type="button"
                  onClick={() => setPassModalDocType(defaultSubmitType)}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-blue-800 hover:bg-blue-900 text-white rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>
                    {defaultSubmitType === 'accomplishment'
                      ? 'Submit Accomplishment'
                      : 'Submit Document'}
                  </span>
                </button>
              </div>
            </header>

            <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
              {isPortalAdminTab && (
                <PortalAdminTabs
                  activeTab={activeHubTab as PortalAdminTabId}
                  portal={portalState}
                  smsLogs={smsLogs}
                  onUpdatePortal={updatePortal}
                  onAppendSmsLog={appendSmsLog}
                  onNotify={notify}
                />
              )}

              {activeHubTab === 'overview' && (
                <DashboardOverview
                  documents={documents}
                  leaderboard={leaderboard}
                  currentUser={currentUser}
                  onUserUpdated={handleUserUpdated}
                  onOpenSubmitModal={(docType) => setPassModalDocType(docType)}
                  onOpenDocTracker={openDocInTracker}
                  onNavigateTab={(tab) => setActiveHubTab(tab)}
                  onOpenDirectory={(userId) => {
                    setSelectedDirectoryUserId(userId ?? null);
                    setActiveHubTab('directory');
                  }}
                  onPrintEartag={(doc) => setEartagDoc(doc)}
                />
              )}

              {activeHubTab === 'general' && (
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

              {activeHubTab === 'accomplishments' && (
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

              {activeHubTab === 'register' && (
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

              {activeHubTab === 'directory' && (
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

              {activeHubTab === 'compilations' && (
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

              {activeHubTab === 'hardcopy' && (
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

              {activeHubTab === 'drive' && <GoogleDriveView />}

              {activeHubTab === 'accounts' && currentUser.role === 'admin' && (
                <AdminAccountsView
                  currentUser={currentUser}
                  settings={settings}
                  onSettingsUpdated={(updated) => setSettings(updated)}
                />
              )}
            </main>
          </div>

          {passModalDocType && (
            <PassDocumentModal
              docType={passModalDocType}
              currentUser={currentUser}
              documents={documents}
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
              onClose={closePreviewModal}
            />
          )}
        </div>

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

        {toastMessage && (
          <div
            role="status"
            className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  // DEFAULT ZERO-LOGIN OFFICIAL PUBLIC PORTAL (YORP-Inspired Architecture)
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 flex flex-col">
      <PublicNavbar
        schoolYear={portalState.schoolYear}
        activeSection={activePortalSection}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={navigatePortal}
        onOpenHub={handleOpenHub}
        isAuthenticated={Boolean(currentUser) && !initializing}
      />

      <main className="no-print flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-16">
        <div id="portal-sec-home" className="scroll-mt-28">
          <LandingSection portal={portalState} onNavigate={navigatePortal} />
        </div>

        <div
          id="portal-sec-directories"
          className="scroll-mt-28 pt-6 border-t border-slate-200 dark:border-slate-800"
        >
          <DirectoriesSection portal={portalState} initialSubTab={dirSubTab} />
        </div>

        <div
          id="portal-sec-services"
          className="scroll-mt-28 pt-6 border-t border-slate-200 dark:border-slate-800"
        >
          <ServicesPrintingSection
            portal={portalState}
            initialSubTab={srvSubTab}
            onSubmitPrintJob={handlePublicPrintJob}
            onSubmitLostReport={handlePublicLostReport}
            onOpenLetterhead={(doc) => setLetterheadDoc(doc)}
            onNotify={notify}
          />
        </div>

        <div
          id="portal-sec-reporting"
          className="scroll-mt-28 pt-6 border-t border-slate-200 dark:border-slate-800"
        >
          <ReportingDeskSection
            portal={portalState}
            initialSubTab={repSubTab}
            onSubmitTicket={handlePublicTicket}
            onOpenLetterhead={(doc) => setLetterheadDoc(doc)}
            onNotify={notify}
          />
        </div>

        <div
          id="portal-sec-calendar"
          className="scroll-mt-28 pt-6 border-t border-slate-200 dark:border-slate-800"
        >
          <CalendarAndVerifierSection
            portal={portalState}
            highlightVerifier={highlightVerifier}
            onNotify={notify}
          />
        </div>

        <div
          id="portal-sec-transparency"
          className="scroll-mt-28 pt-6 border-t border-slate-200 dark:border-slate-800"
        >
          <TransparencySealSection
            portal={portalState}
            initialSubTab={transSubTab}
            onOpenLetterhead={(doc) => setLetterheadDoc(doc)}
            onNotify={notify}
          />
        </div>
      </main>

      {/* Institutional Portal Footer */}
      <footer className="no-print bg-[#0f172a] dark:bg-slate-950 text-slate-300 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-12 gap-8 text-xs">
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-3">
              <SSLGCrest className="w-11 h-11 shrink-0" />
              <div>
                <p className="text-sm font-extrabold text-white">
                  Nabunturan National Comprehensive High School
                </p>
                <p className="text-amber-400 font-semibold">
                  Supreme Secondary Learner Government (NNCHS SSLG)
                </p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Nabunturan, Davao de Oro · Schools Division of Davao de Oro · Nabunturan West
              District. Operating under DepEd Order No. 18, s. 2023 in service of all Junior and
              Senior High School learners.
            </p>
          </div>

          <div className="md:col-span-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Student Services &amp; SMS Hotline
            </p>
            <p>SSLG Office: Room 104, Main Academic Building</p>
            <p>
              Free Printing SMS Alert Custodian:{' '}
              <strong className="font-mono-code text-white">{SSLG_ADMIN_SMS_NUMBER}</strong>
            </p>
            <p>Claim Windows: 9:30–10:00 AM · 12:00–1:00 PM · 4:00–4:45 PM</p>
          </div>

          <div className="md:col-span-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Quick Access
            </p>
            <div className="flex flex-col items-start gap-1.5">
              <button
                type="button"
                onClick={() => navigatePortal({ section: 'services', subTab: 'printing' })}
                className="hover:text-white cursor-pointer"
              >
                Free Printing Queue
              </button>
              <button
                type="button"
                onClick={() => navigatePortal({ section: 'reporting', subTab: 'track' })}
                className="hover:text-white cursor-pointer"
              >
                Live Ticket Status Checker
              </button>
              <button
                type="button"
                onClick={() => navigatePortal({ section: 'transparency' })}
                className="hover:text-white cursor-pointer"
              >
                Transparency Seal &amp; Ledger
              </button>
              <button
                type="button"
                onClick={handleOpenHub}
                className="text-amber-300 font-bold hover:text-amber-200 cursor-pointer"
              >
                SSLG Hub / Records Login →
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800/90 py-4 px-4 text-center text-[11px] text-slate-500">
          NNCHS SSLG Official Digital Portal · SY {portalState.schoolYear} · Nabunturan, Davao de
          Oro
        </div>
      </footer>

      {/* Always-White Formal Official Letterhead Modal */}
      {letterheadDoc && (
        <DocumentLetterheadModal
          doc={letterheadDoc}
          onClose={() => setLetterheadDoc(null)}
          onNotify={notify}
        />
      )}

      {/* Non-blocking Toast */}
      {toastMessage && (
        <div
          role="status"
          className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
