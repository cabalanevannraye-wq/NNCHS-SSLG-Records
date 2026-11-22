import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Lock,
  Menu,
  Printer,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import type { PortalSectionId } from '../../lib/portalStore.ts';
import { SSLGCrest } from '../SSLGCrest.tsx';
import { ThemeToggle, type ThemeMode } from '../ThemeToggle.tsx';

export interface PortalJumpTarget {
  section: PortalSectionId;
  subTab?: string;
}

interface DropdownItem {
  label: string;
  description: string;
  target: PortalJumpTarget;
}

interface NavGroup {
  id: PortalSectionId;
  label: string;
  items?: DropdownItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { id: 'home', label: 'Home' },
  {
    id: 'directories',
    label: 'Directories',
    items: [
      {
        label: 'Executive Officers & Committees',
        description: 'View SSLG officials and digital IDs',
        target: { section: 'directories', subTab: 'officers' },
      },
      {
        label: 'Recognized Clubs & Organizations',
        description: 'Accredited & probationary campus clubs',
        target: { section: 'directories', subTab: 'clubs' },
      },
      {
        label: 'Homeroom Legislative Council',
        description: 'Grade 7–12 class presidents directory',
        target: { section: 'directories', subTab: 'homerooms' },
      },
    ],
  },
  {
    id: 'services',
    label: 'Services & Programs',
    items: [
      {
        label: 'Free Printing & SMS Desk',
        description: '15 free B&W pages daily · SMS to 09163866252',
        target: { section: 'services', subTab: 'printing' },
      },
      {
        label: 'Programs & Initiatives',
        description: 'Ongoing & upcoming flagship projects',
        target: { section: 'services', subTab: 'programs' },
      },
      {
        label: 'NNCHS Lost & Found Board',
        description: 'Browse found items or report lost property',
        target: { section: 'services', subTab: 'lostfound' },
      },
      {
        label: 'Downloadables & Forms Hub',
        description: 'Constitution, proposal & liquidation templates',
        target: { section: 'services', subTab: 'downloads' },
      },
    ],
  },
  {
    id: 'news',
    label: 'News & Events',
    items: [
      {
        label: 'Campus Bulletin & Advisories',
        description: 'Official announcements and recaps',
        target: { section: 'home' },
      },
      {
        label: 'School Activity Calendar',
        description: 'School-wide, club, and exam schedules',
        target: { section: 'calendar' },
      },
      {
        label: 'Officer Digital ID Verifier',
        description: 'Authenticate NNCHS-SSLG ID badges',
        target: { section: 'calendar', subTab: 'verifier' },
      },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting Desk',
    items: [
      {
        label: 'Submit Welfare / Grievance Report',
        description: 'Confidential or anonymous zero-login desk',
        target: { section: 'reporting', subTab: 'submit' },
      },
      {
        label: 'Live Ticket Status Checker',
        description: 'Track NNCHS-SSLG-2026-XXXX status',
        target: { section: 'reporting', subTab: 'track' },
      },
    ],
  },
  {
    id: 'transparency',
    label: 'Resources & Transparency',
    items: [
      {
        label: 'Transparency Seal & Open Ledger',
        description: 'Financial allocations & CSV open data',
        target: { section: 'transparency', subTab: 'finance' },
      },
      {
        label: 'Legislative Resolutions & Orders',
        description: 'Download full enacted resolutions & memos',
        target: { section: 'transparency', subTab: 'legislation' },
      },
    ],
  },
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
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleJump = (target: PortalJumpTarget) => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    onNavigate(target);
  };

  return (
    <header ref={navRef} className="no-print sticky top-0 z-40">
      {/* Top Institutional Utility Bar */}
      <div className="bg-[#0f172a] dark:bg-slate-950 text-slate-200 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between gap-4 text-[11px] sm:text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-semibold text-amber-400 whitespace-nowrap">SY {schoolYear}</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="hidden md:inline text-slate-300 truncate">
              Nabunturan, Davao de Oro · Schools Division of Davao de Oro
            </span>
            <span className="text-slate-600 hidden lg:inline">|</span>
            <span className="font-mono-code text-slate-300 tabular-nums truncate">
              {manilaClock}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => handleJump({ section: 'transparency' })}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Transparency Seal</span>
            </button>
            <span className="text-slate-700">·</span>
            <button
              type="button"
              onClick={() => handleJump({ section: 'services', subTab: 'printing' })}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Free Printing &amp; SMS Desk</span>
            </button>
            <span className="text-slate-700">·</span>
            <button
              type="button"
              onClick={() => handleJump({ section: 'calendar', subTab: 'verifier' })}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verify Officer ID</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Sticky Navigation */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Official Brand Lockup */}
          <button
            type="button"
            onClick={() => handleJump({ section: 'home' })}
            className="flex items-center gap-3 text-left min-w-0 cursor-pointer group"
          >
            <SSLGCrest className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-extrabold tracking-tight text-slate-950 dark:text-white leading-tight truncate group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                NNCHS SSLG
              </p>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Nabunturan National Comprehensive High School
              </p>
            </div>
          </button>

          {/* Desktop Multi-level Navigation */}
          <nav className="hidden xl:flex items-center gap-1" aria-label="Primary portal navigation">
            {NAV_GROUPS.map((group) => {
              const isOpen = openDropdown === group.id;
              const isActive =
                activeSection === group.id ||
                (group.id === 'news' && activeSection === 'calendar');

              if (!group.items) {
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleJump({ section: group.id })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {group.label}
                  </button>
                );
              }

              return (
                <div
                  key={group.id}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(group.id)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenDropdown(isOpen ? null : group.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{group.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-full pt-1.5 w-72 z-50">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 space-y-0.5">
                        {group.items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleJump(item.target)}
                            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer block"
                          >
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {item.label}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            </div>

            <button
              type="button"
              onClick={onOpenHub}
              className="px-3.5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#0f172a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            >
              <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="hidden sm:inline">
                {isAuthenticated ? 'Open SSLG Hub' : 'SSLG Hub / Records Portal'}
              </span>
              <span className="sm:hidden">{isAuthenticated ? 'Hub' : 'Portal Login'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="xl:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Appearance Mode
              </span>
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NAV_GROUPS.map((group) => (
                <div
                  key={group.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2"
                >
                  <button
                    type="button"
                    onClick={() => handleJump({ section: group.id })}
                    className="text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-400 cursor-pointer"
                  >
                    {group.label}
                  </button>
                  {group.items && (
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleJump(item.target)}
                          className="w-full text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-800 dark:hover:text-blue-300 py-1 cursor-pointer block"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
