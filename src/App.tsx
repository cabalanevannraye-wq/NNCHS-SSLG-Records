import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  Activity,
  Award,
  BookOpenCheck,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  Cloud,
  FilePlus2,
  FileSpreadsheet,
  FileStack,
  FileText,
  Globe,
  HardDrive,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Printer,
  ShieldAlert,
  Sparkles,
  Users,
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
import { LoginView, type CmsAdminSession } from './components/LoginView.tsx';
import { PassDocumentModal } from './components/PassDocumentModal.tsx';
import {
  NNCHSSchoolSeal,
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
import {
  DirectoriesSection,
  type DirectorySubTab,
} from './components/portal/DirectoriesSection.tsx';
import { LandingSection } from './components/portal/LandingSection.tsx';
import {
  PortalAdminTabs,
  type PortalAdminTabId,
} from './components/portal/PortalAdminTabs.tsx';
import { ProgramsCalendarSection } from './components/portal/ProgramsCalendarSection.tsx';
import { PublicNavbar, type PortalJumpTarget } from './components/portal/PublicNavbar.tsx';
import { ReportingDeskSection } from './components/portal/ReportingDeskSection.tsx';
import { ResolutionsFundsSection } from './components/portal/ResolutionsFundsSection.tsx';
import { ServicesPrintingSection } from './components/portal/ServicesPrintingSection.tsx';
import {
  WELCOME_SEEN_SESSION_KEY,
  WelcomeOverlay,
} from './components/portal/WelcomeOverlay.tsx';
import {
  getCachedIdToken,
  getDocumentFileUrl,
  getFreshIdToken,
  getHardcopyFileUrl,
} from './lib/api.ts';
import {
  buildLeaderboardAndDirectory,
  DEFAULT_SETTINGS,
  firebaseService,
  resolveSignedInUser,
  subscribeWorkspaceData,
} from './lib/firebaseService.ts';
import { downloadDriveFileBlob } from './lib/googleDrive.ts';
import {
  fetchFromCloud,
  getActiveSyncEndpointInfo,
  loadPortalState,
  pingCloudEndpoint,
  publishToCloud,
  savePortalState,
  submitPublicItemToCloud,
  type GrievanceTicket,
  type LostFoundItem,
  type PortalSectionId,
  type PortalState,
  type PrintRequestJob,
  type SyncConnectionMode,
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
  printing: 'portal-sec-printing',
  reporting: 'portal-sec-reporting',
  'programs-calendar': 'portal-sec-programs-calendar',
  'resolutions-funds': 'portal-sec-resolutions-funds',
};

export default function App() {
  // Global Theme State
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  // Public Portal Shared State (dynamic CMS persistence synced with Admin Hub)
  const [portalState, setPortalState] = useState<PortalState>(() => loadPortalState());
  const portalStateRef = useRef<PortalState>(portalState);
  portalStateRef.current = portalState;
  const [syncMode, setSyncMode] = useState<SyncConnectionMode>('local');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    () => portalState.lastPublishedAt ?? null
  );

  // Navigation & Sub-tab Control
  const [screenMode, setScreenMode] = useState<AppScreenMode>('portal');
  const [activePortalSection, setActivePortalSection] = useState<PortalSectionId>('home');
  const [dirSubTab, setDirSubTab] = useState<DirectorySubTab>('officers');

  // Celebratory Welcome Overlay (first-visit sessionStorage + re-openable)
  const [welcomeOpen, setWelcomeOpen] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(WELCOME_SEEN_SESSION_KEY) !== '1';
    } catch {
      return true;
    }
  });

  // Expandable Admin Header Connection Health Popover
  const [healthOpen, setHealthOpen] = useState(false);
  const [pingingCloud, setPingingCloud] = useState(false);
  const [pingResult, setPingResult] = useState<{
    ok: boolean;
    endpoint: string;
    latencyMs: number;
    error?: string;
    checkedAt: string;
  } | null>(null);
  const healthDropdownRef = useRef<HTMLDivElement | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Official White Letterhead Modal
  const [letterheadDoc, setLetterheadDoc] = useState<LetterheadDocumentPayload | null>(null);

  // In-memory CMS Admin session (never stored in localStorage/sessionStorage)
  const [cmsSession, setCmsSession] = useState<CmsAdminSession | null>(null);

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

  useEffect(() => {
    if (!healthOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        healthDropdownRef.current &&
        !healthDropdownRef.current.contains(e.target as Node)
      ) {
        setHealthOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHealthOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [healthOpen]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleCloseWelcome = () => {
    try {
      sessionStorage.setItem(WELCOME_SEEN_SESSION_KEY, '1');
    } catch {
      // ignore sessionStorage unavailable
    }
    setWelcomeOpen(false);
  };

  const resolveActiveAuthToken = async (): Promise<string | null> => {
    if (cmsSession?.token) return cmsSession.token;
    if (auth.currentUser) {
      try {
        return await getFreshIdToken();
      } catch {
        return getCachedIdToken() || null;
      }
    }
    return null;
  };

  const handlePullCloudNow = async (silent = false) => {
    setSyncing(true);
    try {
      const res = await fetchFromCloud();
      setSyncMode(res.mode);
      if (res.updatedAt) {
        setLastSyncedAt(res.updatedAt);
      }
      if (res.state) {
        setPortalState(res.state);
        portalStateRef.current = res.state;
        if (!silent) {
          notify('Pulled latest published website updates.');
        }
      } else if (!silent) {
        notify('Sync checked. Showing latest available portal state.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const pushStateToCloud = async (targetState: PortalState, showToast = false) => {
    const token = await resolveActiveAuthToken();
    if (!token) return;
    setSyncing(true);
    try {
      const res = await publishToCloud(targetState, token);
      setSyncMode(res.mode);
      setLastSyncedAt(res.updatedAt);
      if (showToast) {
        if (res.ok) {
          notify(
            res.mode === 'cloud'
              ? 'Published to Cloud Sync — visible to all visitors worldwide.'
              : 'Published to shared server — visible to all campus visitors.'
          );
        } else {
          notify(
            res.error ||
              'Saved locally. Connect the shared server or External Cloud Sync URL for cross-device publishing.'
          );
        }
      }
    } finally {
      setSyncing(false);
    }
  };

  const handlePublishNow = async () => {
    await pushStateToCloud(portalStateRef.current, true);
  };

  const handleImportSnapshot = async (imported: PortalState) => {
    setPortalState(imported);
    portalStateRef.current = imported;
    savePortalState(imported);
    await pushStateToCloud(imported, false);
    notify('JSON Snapshot imported and synced cleanly.');
  };

  const handleCommitAndSync = async (nextState: PortalState, successMessage: string) => {
    setPortalState(nextState);
    portalStateRef.current = nextState;
    savePortalState(nextState);
    await pushStateToCloud(nextState, false);
    notify(successMessage);
  };

  const handlePingCloud = async () => {
    setPingingCloud(true);
    try {
      const result = await pingCloudEndpoint();
      setPingResult({
        ok: result.ok,
        endpoint: result.endpoint,
        latencyMs: result.latencyMs,
        error: result.error,
        checkedAt: new Date().toLocaleTimeString(),
      });
      if (result.ok) {
        setSyncMode(result.mode);
        setLastSyncedAt(new Date().toISOString());
        notify(`Cloud ping succeeded (${result.latencyMs} ms).`);
      } else {
        notify(result.error || 'Cloud ping failed.');
      }
    } finally {
      setPingingCloud(false);
    }
  };

  useEffect(() => {
    void handlePullCloudNow(true);
  }, []);

  useEffect(() => {
    if (screenMode !== 'portal') return;
    const timer = window.setInterval(() => {
      void handlePullCloudNow(true);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [screenMode]);

  const updatePortal = (updater: (prev: PortalState) => PortalState) => {
    const next = updater(portalStateRef.current);
    portalStateRef.current = next;
    setPortalState(next);
    savePortalState(next);
    void pushStateToCloud(next, false);
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

  const hasHubAccess = Boolean(currentUser || cmsSession);

  // Portal Navigation Helper
  const navigatePortal = (target: PortalJumpTarget) => {
    setScreenMode('portal');
    setActivePortalSection(target.section);

    if (target.section === 'directories' && target.subTab) {
      setDirSubTab(target.subTab as DirectorySubTab);
    }

    const domId = PORTAL_SECTION_DOM_ID[target.section];
    window.setTimeout(() => {
      const el = document.getElementById(domId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Public Portal Submission Handlers (Local + Shared Server / Cloud Sync)
  const handlePublicPrintJob = (job: PrintRequestJob) => {
    const next: PortalState = {
      ...portalStateRef.current,
      printJobs: [job, ...portalStateRef.current.printJobs],
    };
    portalStateRef.current = next;
    setPortalState(next);
    savePortalState(next);
    void submitPublicItemToCloud('print-jobs', job, next).then(({ synced, mode }) => {
      if (synced) {
        setSyncMode(mode);
        setLastSyncedAt(new Date().toISOString());
      }
    });
  };

  const handlePublicLostReport = (item: LostFoundItem) => {
    const next: PortalState = {
      ...portalStateRef.current,
      lostFound: [item, ...portalStateRef.current.lostFound],
    };
    portalStateRef.current = next;
    setPortalState(next);
    savePortalState(next);
    void submitPublicItemToCloud('lost-found', item, next).then(({ synced, mode }) => {
      if (synced) {
        setSyncMode(mode);
        setLastSyncedAt(new Date().toISOString());
      }
    });
  };

  const handlePublicTicket = (ticket: GrievanceTicket) => {
    const next: PortalState = {
      ...portalStateRef.current,
      tickets: [ticket, ...portalStateRef.current.tickets],
    };
    portalStateRef.current = next;
    setPortalState(next);
    savePortalState(next);
    void submitPublicItemToCloud('tickets', ticket, next).then(({ synced, mode }) => {
      if (synced) {
        setSyncMode(mode);
        setLastSyncedAt(new Date().toISOString());
      }
    });
  };

  // Hub Handlers
  const handleOpenHub = () => {
    if (hasHubAccess) {
      setScreenMode('hub');
    } else {
      setScreenMode('hub-login');
    }
  };

  const handleLogout = async () => {
    clearGoogleDriveAccessToken();
    setCmsSession(null);
    await signOut(auth);
    setScreenMode('portal');
    notify('NNCHS SSLG Admin Portal signed out cleanly.');
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
    { id: 'portal-printing', label: 'Printables & Free Printing', icon: Printer },
    { id: 'portal-grievances', label: 'Grievance Moderation', icon: ShieldAlert },
    { id: 'portal-bulletin', label: 'Slideshow, Advisory & Stats', icon: Megaphone },
    { id: 'portal-programs-lf', label: 'Programs & Lost/Found', icon: Sparkles },
    { id: 'portal-directory', label: 'Directories & Services Info', icon: Users },
    { id: 'portal-res-cal-funds', label: 'Resolutions, Calendar & Funds', icon: Calendar },
    { id: 'portal-import-export', label: 'Import / Export (CSV)', icon: FileSpreadsheet },
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

  const visibleRecordsNav = currentUser
    ? recordsNavItems.filter((item) => !item.adminOnly || currentUser.role === 'admin')
    : [];

  const allHubLabels = [...portalManagementNav, ...visibleRecordsNav];
  const activeHubTitle =
    allHubLabels.find((i) => i.id === activeHubTab)?.label || 'NNCHS SSLG Admin Portal';
  const defaultSubmitType: DocumentModuleType =
    activeHubTab === 'accomplishments' ? 'accomplishment' : 'general';

  // Render Embedded Login View when requested
  if (screenMode === 'hub-login' && !hasHubAccess) {
    return (
      <LoginView
        authBlockState={authBlockState}
        onClearBlockState={() => setAuthBlockState(null)}
        onCmsAdminSignedIn={(session) => {
          setCmsSession(session);
          setActiveHubTab('portal-printing');
          setScreenMode('hub');
          notify(`Signed in as Website Admin (${session.username}).`);
        }}
        onReturnToPortal={() => setScreenMode('portal')}
      />
    );
  }

  // Render Authenticated Hub (6 Dynamic Website CMS Tabs + Firebase 5-Stage Records Vault)
  if (screenMode === 'hub' && hasHubAccess) {
    const isPortalAdminTab = activeHubTab.startsWith('portal-');
    const displayUserName = currentUser?.fullName || `Admin (${cmsSession?.username || 'SSLG'})`;
    const displayRoleLabel = currentUser?.positionOrClub || 'Dynamic Website CMS Custodian';

    return (
      <>
        <div className="no-print min-h-screen bg-[#f8fafc] dark:bg-[#0b1120] flex flex-col lg:flex-row">
          {mobileNavOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
          )}

          <aside
            className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] text-slate-100 flex flex-col justify-between transition-transform lg:static lg:translate-x-0 shrink-0 ${
              mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-5 border-b border-blue-900/60 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <SSLGCrest className="w-9 h-9 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-white truncate">NNCHS SSLG Admin</p>
                    <p className="text-[11px] font-bold text-[#fde047] truncate">
                      SY {portalState.schoolYear}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="lg:hidden p-1.5 text-slate-300 hover:text-white cursor-pointer"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 space-y-5">
                <div>
                  <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#fde047]">
                    Dynamic Website CMS
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
                              ? 'bg-[#1e3a8a] text-white border border-blue-600'
                              : 'text-slate-300 hover:bg-blue-950/70 hover:text-white'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#fde047]' : ''}`} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {visibleRecordsNav.length > 0 && (
                  <div>
                    <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-300">
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
                                ? 'bg-[#1e3a8a] text-white border border-blue-600'
                                : 'text-slate-300 hover:bg-blue-950/70 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#fde047]' : ''}`} />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-blue-900/60 space-y-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <UserAvatar
                    fullName={displayUserName}
                    avatarDataUrl={currentUser?.avatarDataUrl}
                    size="sm"
                  />
                  {currentUser && (
                    <>
                      <button
                        type="button"
                        onClick={() => sidebarAvatarInputRef.current?.click()}
                        title="Update profile picture"
                        aria-label="Update profile picture"
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1e3a8a] hover:bg-[#1d4ed8] text-[#fde047] border border-slate-900 flex items-center justify-center cursor-pointer"
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
                    </>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{displayUserName}</p>
                  <p className="text-[11px] text-[#fde047] truncate">{displayRoleLabel}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {currentUser
                      ? currentUser.username
                        ? `@${currentUser.username}`
                        : currentUser.email
                      : `@${cmsSession?.username}`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScreenMode('portal')}
                  className="py-2 px-2.5 text-xs font-bold text-slate-950 bg-[#facc15] hover:bg-[#eab308] rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public Site</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="py-2 px-2.5 text-xs font-semibold text-slate-200 bg-blue-950 hover:bg-blue-900 border border-blue-800 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0">
            <header className="bg-white dark:bg-slate-900 border-b border-blue-100 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="lg:hidden p-2 text-blue-950 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-extrabold text-blue-950 dark:text-white truncate">
                    {activeHubTitle}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Nabunturan National Comprehensive High School — Supreme Secondary Learner Government
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <div className="relative" ref={healthDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setHealthOpen((v) => !v)}
                    aria-expanded={healthOpen}
                    aria-label="Inspect connection health"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors whitespace-nowrap ${
                      syncMode === 'cloud' || syncMode === 'server'
                        ? 'bg-[#facc15]/25 text-blue-950 dark:text-[#fde047] border-[#eab308]/80 hover:bg-[#facc15]/35'
                        : 'bg-blue-50 dark:bg-slate-800 text-blue-900 dark:text-slate-200 border-blue-200 dark:border-slate-700 hover:bg-blue-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Connection Health</span>
                    <span className="sm:hidden">Health</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        healthOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {healthOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 shadow-2xl p-4 space-y-3 z-50 text-xs">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-blue-100 dark:border-slate-800">
                        <span className="font-extrabold text-blue-950 dark:text-white flex items-center gap-1.5">
                          <Cloud className="w-4 h-4 text-blue-700 dark:text-[#fde047]" />
                          <span>Connection Health</span>
                        </span>
                        <span className="font-extrabold text-blue-800 dark:text-[#fde047]">
                          {syncMode === 'cloud'
                            ? 'Live Cloud Sync'
                            : syncMode === 'server'
                            ? 'Shared Server Sync'
                            : 'Local Preview'}
                        </span>
                      </div>

                      <div className="space-y-2 text-[11px]">
                        <div>
                          <p className="font-bold text-slate-500 dark:text-slate-400">
                            Last Successful Sync
                          </p>
                          <p className="font-mono-code font-semibold text-blue-950 dark:text-slate-100 tabular-nums">
                            {lastSyncedAt
                              ? new Date(lastSyncedAt).toLocaleString()
                              : 'Not synced in this session'}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 dark:text-slate-400">
                            Current Active Endpoint
                          </p>
                          <p className="font-mono-code text-blue-900 dark:text-yellow-200 break-all bg-blue-50/70 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-slate-800 mt-0.5">
                            {getActiveSyncEndpointInfo().endpoint}
                          </p>
                        </div>
                      </div>

                      {pingResult && (
                        <div
                          className={`p-2.5 rounded-lg border text-[11px] font-semibold ${
                            pingResult.ok
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-[#fde047]'
                              : 'bg-yellow-50 dark:bg-yellow-950/50 border-[#eab308] text-slate-950 dark:text-yellow-200'
                          }`}
                        >
                          {pingResult.ok
                            ? `Cloud Reachable · ${pingResult.latencyMs} ms (checked ${pingResult.checkedAt})`
                            : `Ping Failed (${pingResult.latencyMs} ms): ${pingResult.error || 'Unreachable'}`}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          disabled={pingingCloud}
                          onClick={() => void handlePingCloud()}
                          className="px-3.5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                        >
                          <Activity className="w-3.5 h-3.5 text-[#fde047]" />
                          <span>{pingingCloud ? 'Pinging...' : 'Ping Cloud'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHealthOpen(false)}
                          className="px-3 py-2 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={() => void handlePublishNow()}
                  className="px-3 py-2 text-xs font-extrabold bg-[#facc15] hover:bg-[#eab308] text-slate-950 rounded-lg inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{syncing ? 'Syncing...' : 'Publish to All'}</span>
                </button>
                <ThemeToggle theme={theme} onToggle={toggleTheme} compact />
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setPassModalDocType(defaultSubmitType)}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <FilePlus2 className="w-4 h-4 text-[#fde047]" />
                    <span>
                      {defaultSubmitType === 'accomplishment'
                        ? 'Submit Accomplishment'
                        : 'Submit Document'}
                    </span>
                  </button>
                )}
              </div>
            </header>

            <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
              {isPortalAdminTab && (
                <PortalAdminTabs
                  activeTab={activeHubTab as PortalAdminTabId}
                  portal={portalState}
                  onUpdatePortal={updatePortal}
                  onNotify={notify}
                  syncMode={syncMode}
                  syncing={syncing}
                  lastSyncedAt={lastSyncedAt}
                  onPublishNow={handlePublishNow}
                  onPullCloudNow={() => handlePullCloudNow(false)}
                  onImportSnapshot={handleImportSnapshot}
                  onCommitAndSync={handleCommitAndSync}
                  authToken={cmsSession?.token || getCachedIdToken() || null}
                  currentAdminUsername={cmsSession?.username || currentUser?.username || 'admin'}
                  onCredentialsUpdated={(newUsername, newToken) =>
                    setCmsSession({ username: newUsername, token: newToken })
                  }
                />
              )}

              {currentUser && activeHubTab === 'overview' && (
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

              {currentUser && activeHubTab === 'general' && (
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

              {currentUser && activeHubTab === 'accomplishments' && (
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

              {currentUser && activeHubTab === 'register' && (
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

              {currentUser && activeHubTab === 'directory' && (
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

              {currentUser && activeHubTab === 'compilations' && (
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

              {currentUser && activeHubTab === 'hardcopy' && (
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

              {currentUser && activeHubTab === 'drive' && <GoogleDriveView />}

              {currentUser && activeHubTab === 'accounts' && currentUser.role === 'admin' && (
                <AdminAccountsView
                  currentUser={currentUser}
                  settings={settings}
                  onSettingsUpdated={(updated) => setSettings(updated)}
                />
              )}
            </main>
          </div>

          {currentUser && passModalDocType && (
            <PassDocumentModal
              docType={passModalDocType}
              currentUser={currentUser}
              documents={documents}
              onClose={() => setPassModalDocType(null)}
              onCreated={handleDocumentCreated}
              onViewTracker={openDocInTracker}
            />
          )}

          {currentUser && esignDoc && (
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
            className="no-print fixed bottom-5 right-5 z-50 bg-[#0f172a] text-white px-4 py-3 rounded-xl shadow-xl border border-[#facc15]/60 text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#fde047] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  // PUBLIC NNCHS SSLG WEBSITE (Blue & Compre Yellow, Dynamic CMS Connected)
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 flex flex-col">
      <PublicNavbar
        schoolYear={portalState.schoolYear}
        activeSection={activePortalSection}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={navigatePortal}
        onOpenHub={handleOpenHub}
        onOpenWelcome={() => setWelcomeOpen(true)}
        isAuthenticated={hasHubAccess && !initializing}
      />

      <main className="no-print flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-16">
        <div id="portal-sec-home" className="scroll-mt-28">
          <LandingSection portal={portalState} onNavigate={navigatePortal} />
        </div>

        <div
          id="portal-sec-directories"
          className="scroll-mt-28 pt-6 border-t border-blue-100 dark:border-slate-800"
        >
          <DirectoriesSection portal={portalState} initialSubTab={dirSubTab} />
        </div>

        <div
          id="portal-sec-printing"
          className="scroll-mt-28 pt-6 border-t border-blue-100 dark:border-slate-800"
        >
          <ServicesPrintingSection
            portal={portalState}
            onSubmitPrintJob={handlePublicPrintJob}
            onNotify={notify}
          />
        </div>

        <div
          id="portal-sec-reporting"
          className="scroll-mt-28 pt-6 border-t border-blue-100 dark:border-slate-800"
        >
          <ReportingDeskSection
            portal={portalState}
            onSubmitTicket={handlePublicTicket}
            onNotify={notify}
          />
        </div>

        <div
          id="portal-sec-programs-calendar"
          className="scroll-mt-28 pt-6 border-t border-blue-100 dark:border-slate-800"
        >
          <ProgramsCalendarSection
            portal={portalState}
            onSubmitLostFound={handlePublicLostReport}
            onNotify={notify}
          />
        </div>

        <div
          id="portal-sec-resolutions-funds"
          className="scroll-mt-28 pt-6 border-t border-blue-100 dark:border-slate-800"
        >
          <ResolutionsFundsSection
            portal={portalState}
            onOpenLetterhead={(doc) => setLetterheadDoc(doc)}
            onNotify={notify}
          />
        </div>
      </main>

      {/* Clean NNCHS SSLG Footer (Admin-Editable Learner Services & Contact Info) */}
      <footer className="no-print bg-[#0f172a] dark:bg-slate-950 text-slate-300 border-t-4 border-[#eab308] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-12 gap-8 text-xs">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <NNCHSSchoolSeal className="w-11 h-11 shrink-0" />
              <SSLGCrest className="w-11 h-11 shrink-0" />
              <div>
                <p className="text-sm font-extrabold text-white">
                  Nabunturan National Comprehensive High School
                </p>
                <p className="text-[#fde047] font-bold">
                  Supreme Secondary Learner Government (NNCHS SSLG)
                </p>
              </div>
            </div>
            <a
              href={portalState.messengerGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-slate-950 font-extrabold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Join SSLG Updates Messenger Group</span>
            </a>
          </div>

          <div className="md:col-span-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#fde047]">
              Learner Services &amp; Contact Info
            </p>
            <p className="text-white font-semibold">
              {portalState.learnerServicesContact.officeLocation}
            </p>
            <p>Hours: {portalState.learnerServicesContact.officeHours}</p>
            <p>
              Contact:{' '}
              <strong className="font-mono-code text-[#fde047]">
                {portalState.learnerServicesContact.contactNumber}
              </strong>
            </p>
            <p>Email: {portalState.learnerServicesContact.email}</p>
            <p className="text-slate-400 leading-relaxed pt-1">
              {portalState.learnerServicesContact.serviceNote}
            </p>
          </div>

          <div className="md:col-span-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#fde047]">
              Navigation
            </p>
            <div className="flex flex-col items-start gap-1.5">
              <button
                type="button"
                onClick={() => navigatePortal({ section: 'directories' })}
                className="hover:text-[#fde047] cursor-pointer"
              >
                Directory
              </button>
              <button
                type="button"
                onClick={() => navigatePortal({ section: 'printing' })}
                className="hover:text-[#fde047] cursor-pointer"
              >
                Free Printing Services
              </button>
              <button
                type="button"
                onClick={() => navigatePortal({ section: 'reporting' })}
                className="hover:text-[#fde047] cursor-pointer"
              >
                Reporting System
              </button>
              <button
                type="button"
                onClick={() => navigatePortal({ section: 'programs-calendar' })}
                className="hover:text-[#fde047] cursor-pointer"
              >
                Programs &amp; Calendar
              </button>
              <button
                type="button"
                onClick={() => navigatePortal({ section: 'resolutions-funds' })}
                className="hover:text-[#fde047] cursor-pointer"
              >
                Resolutions &amp; Funds
              </button>
              <button
                type="button"
                onClick={() => setWelcomeOpen(true)}
                className="hover:text-[#fde047] cursor-pointer"
              >
                Welcome Banner
              </button>
              <button
                type="button"
                onClick={handleOpenHub}
                className="text-[#fde047] font-extrabold hover:text-yellow-200 cursor-pointer pt-1"
              >
                Admin Portal →
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800/90 py-5 px-4 max-w-7xl mx-auto space-y-2 text-center text-[11px] text-slate-400">
          <p className="text-slate-300 leading-relaxed max-w-4xl mx-auto">
            Data Privacy &amp; Child Protection Notice: All information submitted through this
            portal is strictly confidential and protected under the Data Privacy Act of 2012 (RA
            10173), the Anti-Bullying Act of 2013 (RA 10627), and the DepEd Child Protection Policy
            (DepEd Order No. 40, s. 2012). Access to this report is restricted solely to authorized
            school welfare personnel.
          </p>
          <p className="text-slate-400 font-semibold">
            NNCHS Supreme Secondary Learner Government · SY {portalState.schoolYear}
          </p>
        </div>
      </footer>

      {/* Celebratory First-Visit & Re-openable Welcome Pop-Up Overlay */}
      <WelcomeOverlay
        isOpen={welcomeOpen}
        schoolYear={portalState.schoolYear}
        onClose={handleCloseWelcome}
      />

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
          className="no-print fixed bottom-5 right-5 z-50 bg-[#0f172a] text-white px-4 py-3 rounded-xl shadow-xl border border-[#facc15]/60 text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-[#fde047] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
