import { useEffect, useState } from 'react';
import { Lock, Menu, RefreshCw, Sparkles, X } from 'lucide-react';
import type { PortalSectionId } from '../../lib/portalStore.ts';
import { NNCHSSchoolSeal, SSLGCrest } from '../SSLGCrest.tsx';
import { ThemeToggle, type ThemeMode } from '../ThemeToggle.tsx';

export interface PortalJumpTarget {
  section: PortalSectionId;
  subTab?: string;
}

const NAV_LINKS: Array<{ id: PortalSectionId; label: string }> = [
  { id: 'home', label: 'SSLG Website' },
  { id: 'directories', label: 'Directory' },
  { id: 'printing', label: 'Free Printing Services' },
  { id: 'reporting', label: 'Reporting System' },
  { id: 'programs-calendar', label: 'Programs & Calendar' },
  { id: 'resolutions-funds', label: 'Resolutions & Funds' },
];

function useManilaClock(): string {
  const [clockText, setClockText] = useState('');

  useEffect(() => {
    const update = () => {
      try {
        const now = new Date();
        const formatted = now.toLocaleString('en-PH', {
          timeZone: 'Asia/Manila',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        setClockText(`${formatted} PST`);
      } catch {
        setClockText(new Date().toLocaleTimeString());
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return clockText;
}

export function PublicNavbar({
  schoolYear,
  activeSection,
  theme,
  onToggleTheme,
  onNavigate,
  onOpenHub,
  onOpenWelcome,
  onSyncLatest,
  syncing = false,
  isAuthenticated,
}: {
  schoolYear: string;
  activeSection: PortalSectionId;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNavigate: (target: PortalJumpTarget) => void;
  onOpenHub: () => void;
  onOpenWelcome: () => void;
  onSyncLatest?: () => void;
  syncing?: boolean;
  isAuthenticated: boolean;
}) {
  const manilaClock = useManilaClock();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleJump = (section: PortalSectionId) => {
    setMobileMenuOpen(false);
    onNavigate({ section });
  };

  return (
    <header className="no-print sticky top-0 z-40">
      {/* Top Institutional Utility Bar — Clean SY & PST Clock Only */}
      <div className="bg-[#0f172a] dark:bg-slate-950 text-slate-100 border-b border-blue-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between gap-4 text-[11px] sm:text-xs">
          <p className="font-bold text-[#fde047] whitespace-nowrap">SY {schoolYear}</p>
          <span className="font-mono-code text-yellow-300 tabular-nums whitespace-nowrap shrink-0">
            {manilaClock}
          </span>
        </div>
      </div>

      {/* Main Sticky Glassmorphic Navigation */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-blue-900/10 dark:border-yellow-400/20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2.5">
          {/* Official Brand Title & Seals */}
          <button
            type="button"
            onClick={() => handleJump('home')}
            className="flex items-center gap-2.5 text-left min-w-0 cursor-pointer group flex-1 xl:flex-initial xl:max-w-[330px]"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <NNCHSSchoolSeal className="w-8 h-8 sm:w-9 sm:h-9" />
              <SSLGCrest className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <span className="text-[11px] sm:text-xs font-extrabold tracking-tight text-blue-950 dark:text-white leading-snug group-hover:text-blue-700 dark:group-hover:text-yellow-300 transition-colors line-clamp-2">
              Nabunturan National Comprehensive High School — Supreme Secondary Learner Government
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden xl:flex items-center gap-0.5 shrink-0"
            aria-label="Primary website navigation"
          >
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleJump(link.id)}
                  className={`px-2 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-blue-900 dark:text-yellow-300 underline decoration-2 decoration-[#eab308] underline-offset-4'
                      : 'text-slate-700 dark:text-slate-200 hover:text-blue-800 dark:hover:text-yellow-300 hover:underline underline-offset-4'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Sync Latest + Welcome Banner + Theme Switcher + Admin Portal CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onSyncLatest && (
              <button
                type="button"
                disabled={syncing}
                onClick={onSyncLatest}
                title="Sync Latest Published Updates"
                className="hidden lg:inline-flex px-2.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-950 dark:text-[#fde047] border border-blue-200 dark:border-slate-700 text-xs font-extrabold items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden 2xl:inline">{syncing ? 'Syncing...' : 'Sync Latest'}</span>
                <span className="2xl:hidden">Sync</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenWelcome}
              title="Open Welcome Banner"
              className="hidden md:inline-flex px-2.5 py-2 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden 2xl:inline">Welcome Banner</span>
              <span className="2xl:hidden">Welcome</span>
            </button>

            <div className="hidden sm:block shrink-0">
              <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
            </div>

            <button
              type="button"
              onClick={onOpenHub}
              className="px-3 sm:px-3.5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 border border-blue-900 dark:border-blue-500"
            >
              <Lock className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
              <span className="hidden sm:inline">
                {isAuthenticated ? 'Admin Hub Open' : 'Admin Portal'}
              </span>
              <span className="sm:hidden">{isAuthenticated ? 'Hub' : 'Admin'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="xl:hidden p-2 rounded-lg border border-blue-200 dark:border-slate-700 text-blue-950 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-blue-900/10 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Theme Mode
              </span>
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleJump(link.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeSection === link.id
                      ? 'bg-[#1e3a8a] text-white'
                      : 'bg-blue-50/70 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-blue-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {onSyncLatest && (
                <button
                  type="button"
                  disabled={syncing}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSyncLatest();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-950 dark:text-[#fde047] border border-blue-200 dark:border-slate-700 text-xs font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Syncing...' : 'Sync Latest'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenWelcome();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-950 dark:text-[#fde047] border border-blue-200 dark:border-slate-700 text-xs font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Welcome Banner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenHub();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-slate-950 text-xs font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isAuthenticated ? 'Open Admin Hub' : 'Open Admin Portal'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
