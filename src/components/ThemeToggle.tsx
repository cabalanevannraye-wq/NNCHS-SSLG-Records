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
    // ignore storage access issues
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
    // ignore storage access issues
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
      className={`group inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
        compact ? 'px-2.5 py-2 text-xs font-semibold' : 'px-3 py-2 text-xs font-semibold'
      }`}
    >
      <span className="transition-transform duration-200 group-hover:rotate-12">
        {isDark ? (
          <Sun className="w-4 h-4 text-yellow-400 shrink-0" />
        ) : (
          <Moon className="w-4 h-4 text-blue-800 shrink-0" />
        )}
      </span>
      {!compact && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  );
}
