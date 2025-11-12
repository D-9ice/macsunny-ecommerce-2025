'use client';

import { useTheme, ThemeMode } from '@/app/context/ThemeContext';
import { Sun, Moon, Sparkles } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, updateTheme } = useTheme();

  const themes: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
    { mode: 'light', icon: Sun, label: 'Light' },
    { mode: 'dark', icon: Moon, label: 'Dark' },
    { mode: 'premium', icon: Sparkles, label: 'Premium' },
  ];

  return (
    <div className="inline-flex gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700">
      {themes.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => updateTheme({ mode })}
          className={`
            flex items-center gap-2 rounded-md px-4 py-2 font-medium
            transition-all duration-200
            ${
              theme.mode === mode
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }
          `}
          title={`Switch to ${label} theme`}
          aria-label={`Switch to ${label} theme`}
        >
          <Icon className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </button>
      ))}
    </div>
  );
}
