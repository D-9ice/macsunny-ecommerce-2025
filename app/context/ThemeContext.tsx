'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  DEFAULT_SITE_THEME,
  containerWidth,
  sanitizeSiteTheme,
  type SiteThemeSettings,
  type ThemeMode,
} from '@/app/lib/siteTheme';

export type { ThemeMode };
export type ThemeSettings = SiteThemeSettings;

interface ThemeContextType {
  theme: ThemeSettings;
  setTheme: Dispatch<SetStateAction<ThemeSettings>>;
  updateTheme: (changes: Partial<ThemeSettings>) => void;
  saveTheme: () => Promise<boolean>;
  resetTheme: () => void;
  refreshTheme: () => Promise<void>;
  ready: boolean;
}

const STORAGE_KEY = 'macsunny_theme';
const LEGACY_STORAGE_KEY = 'ms_theme_settings';

const noopSetter: Dispatch<SetStateAction<ThemeSettings>> = () => {};

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_SITE_THEME,
  setTheme: noopSetter,
  updateTheme: () => {},
  saveTheme: async () => false,
  resetTheme: () => {},
  refreshTheme: async () => {},
  ready: false,
});

export const useTheme = () => useContext(ThemeContext);

function readCachedTheme(): ThemeSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return sanitizeSiteTheme(JSON.parse(raw), DEFAULT_SITE_THEME);
  } catch {
    return null;
  }
}

function cacheTheme(theme: ThemeSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // The server remains the authority if localStorage is unavailable.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_SITE_THEME);
  const [ready, setReady] = useState(false);

  const refreshTheme = async () => {
    try {
      const response = await fetch('/api/settings', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data?.success || !data?.theme) return;
      const next = sanitizeSiteTheme(data.theme, DEFAULT_SITE_THEME);
      setTheme(next);
      cacheTheme(next);
    } catch {
      // Keep the last known theme; never blank or reset the storefront on a transient failure.
    }
  };

  useEffect(() => {
    const cached = readCachedTheme();
    if (cached) setTheme(cached);
    setReady(true);
    void refreshTheme();

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        setTheme(sanitizeSiteTheme(JSON.parse(event.newValue), DEFAULT_SITE_THEME));
      } catch {
        // Ignore malformed cross-tab values.
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const root = document.documentElement;
    root.setAttribute('data-theme', theme.mode);
    root.style.setProperty('--accent-color', theme.accent);
    root.style.setProperty('--ms-accent', theme.accent);
    root.style.setProperty('--ms-font-scale', String(theme.fontScale));
    root.style.setProperty('--ms-container-width', containerWidth(theme.container));
    root.style.setProperty('--ms-radius-card', theme.rounded ? '1rem' : '0.125rem');
    root.style.setProperty('--ms-radius-panel', theme.rounded ? '1.5rem' : '0.125rem');
    root.style.setProperty('--ms-radius-control', theme.rounded ? '0.55rem' : '0.125rem');
    root.style.setProperty('--ms-radius-pill', theme.rounded ? '999px' : '0.125rem');

    const adminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
    root.style.fontSize = adminRoute ? '16px' : `${(16 * theme.fontScale).toFixed(2)}px`;

    cacheTheme(theme);
  }, [theme, ready, pathname]);

  const updateTheme = (changes: Partial<ThemeSettings>) => {
    setTheme((current) => sanitizeSiteTheme({ ...current, ...changes }, current));
  };

  const saveTheme = async () => {
    const next = sanitizeSiteTheme(theme, DEFAULT_SITE_THEME);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme: next }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data?.theme) return false;
      const persisted = sanitizeSiteTheme(data.theme, next);
      setTheme(persisted);
      cacheTheme(persisted);
      return true;
    } catch {
      return false;
    }
  };

  const resetTheme = () => setTheme(DEFAULT_SITE_THEME);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, updateTheme, saveTheme, resetTheme, refreshTheme, ready }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
