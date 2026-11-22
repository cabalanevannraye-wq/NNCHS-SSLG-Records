import { Moon, Sun } from 'lucide-react';
import { THEME_STORAGE_KEY } from '../lib/portalStore.ts';

export type ThemeMode = 'light' | 'dark';

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore storage restriction
  }
  return 'light';
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage error
  }
}

export function ThemeToggle({
  theme,
  onToggle,
  compact = false,
}: {
  theme: ThemeMode;
  onToggle: () => void;
  compact?: boolean;
}) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
        compact ? 'px-2.5 py-2 text-xs font-semibold' : 'px-3 py-2 text-xs font-semibold'
      }`}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 shrink-0" />
          {!compact && <span>Light</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-slate-700 shrink-0" />
          {!compact && <span>Dark</span>}
        </>
      )}
    </button>
  );
}
