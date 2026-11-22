import { useEffect, useState } from 'react';
import { Lock, Menu, X } from 'lucide-react';
import type { PortalSectionId } from '../../lib/portalStore.ts';
import { SSLGCrest } from '../SSLGCrest.tsx';
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
  isAuthenticated,
}: {
  schoolYear: string;
  activeSection: PortalSectionId;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNavigate: (target: PortalJumpTarget) => void;
  onOpenHub: () => void;
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
      {/* Top Institutional Utility Bar — Exact Requested Copy Only */}
      <div className="bg-[#0f172a] dark:bg-slate-950 text-slate-100 border-b border-blue-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between gap-4 text-[11px] sm:text-xs">
          <p className="truncate font-medium">
            <span className="font-bold text-[#fde047]">SY {schoolYear}</span>
            <span className="mx-2 text-blue-500">|</span>
            <span>Nabunturan, Davao de Oro · Schools Division of Davao de Oro</span>
          </p>
          <span className="font-mono-code text-yellow-300 tabular-nums whitespace-nowrap shrink-0">
            {manilaClock}
          </span>
        </div>
      </div>

      {/* Main Sticky Navigation */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-blue-100 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
          {/* Official Brand Title */}
          <button
            type="button"
            onClick={() => handleJump('home')}
            className="flex items-center gap-3 text-left min-w-0 cursor-pointer group shrink-0 max-w-[340px] sm:max-w-md lg:max-w-sm xl:max-w-md"
          >
            <SSLGCrest className="w-10 h-10 shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold tracking-tight text-blue-950 dark:text-white leading-snug group-hover:text-blue-700 dark:group-hover:text-yellow-300 transition-colors line-clamp-2">
              Nabunturan National Comprehensive High School — Supreme Secondary Learner Government
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav
            className="hidden xl:flex items-center gap-1"
            aria-label="Primary website navigation"
          >
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleJump(link.id)}
                  className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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

          {/* Right Controls: Theme Switcher + Admin Portal CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            </div>

            <button
              type="button"
              onClick={onOpenHub}
              className="px-3.5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1d4ed8] dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 border border-blue-900 dark:border-blue-500"
            >
              <Lock className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
              <span>{isAuthenticated ? 'Admin Hub Open' : 'Admin Portal'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="xl:hidden p-2 rounded-lg border border-blue-200 dark:border-slate-700 text-blue-950 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-blue-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
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
          </div>
        )}
      </div>
    </header>
  );
}
