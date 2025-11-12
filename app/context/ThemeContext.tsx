'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'premium';

export interface ThemeSettings {
  mode: ThemeMode;
  accent: string;
}

interface ThemeContextType {
  theme: ThemeSettings;
  setTheme: (t: ThemeSettings) => void;
  updateTheme: (changes: Partial<ThemeSettings>) => void;
}

const defaultTheme: ThemeSettings = {
  mode: 'dark',
  accent: '#22c55e', // Green-500
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
  updateTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount (client-side only)
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('macsunny_theme');
    if (saved) {
      try {
        const parsedTheme = JSON.parse(saved);
        setTheme(parsedTheme);
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    }
  }, []);

  // Apply theme to document when theme changes
  useEffect(() => {
    if (!mounted) return;

    // Apply data-theme attribute for CSS variables
    document.documentElement.setAttribute('data-theme', theme.mode);
    
    // Apply custom accent color
    document.documentElement.style.setProperty('--accent-color', theme.accent);
    
    // Save to localStorage
    localStorage.setItem('macsunny_theme', JSON.stringify(theme));
  }, [theme, mounted]);

  const updateTheme = (changes: Partial<ThemeSettings>) => {
    setTheme((prev) => {
      const newTheme = { ...prev, ...changes };
      
      // Set default accent colors for each theme mode if not explicitly provided
      if (changes.mode && !changes.accent) {
        if (changes.mode === 'premium') {
          newTheme.accent = '#fbbf24'; // Gold for premium
        } else if (changes.mode === 'light' || changes.mode === 'dark') {
          newTheme.accent = '#22c55e'; // Green for light/dark
        }
      }
      
      return newTheme;
    });
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
