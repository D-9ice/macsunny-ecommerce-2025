'use client';

import React from 'react';
import { useTheme, ThemeMode } from '@/app/context/ThemeContext';

export default function ThemeCustomizer() {
  const { theme, updateTheme } = useTheme();

  return (
    <section className="mt-10 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-md shadow-black/30">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
        🎨 Theme Customizer
      </h2>
      <p className="text-gray-400 mb-6">
        Adjust the appearance of your system. Changes apply live across the entire site.
      </p>

      {/* Mode Selection */}
      <div className="mb-5">
        <h3 className="text-lg font-semibold mb-2 text-white">Theme Mode</h3>
        <div className="flex gap-3">
          {(['light', 'dark', 'premium'] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => updateTheme({ mode })}
              className={`px-4 py-2 rounded-lg capitalize font-semibold transition-all ${
                theme.mode === mode
                  ? 'bg-green-700 ring-2 ring-green-400 shadow-lg text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color Picker */}
      <div className="mb-5">
        <h3 className="text-lg font-semibold mb-2 text-white">Accent Color</h3>
        <input
          type="color"
          value={theme.accent}
          onChange={(e) => updateTheme({ accent: e.target.value })}
          className="w-16 h-10 rounded border border-gray-700 cursor-pointer"
        />
        <p className="text-sm text-gray-400 mt-1">{theme.accent}</p>
      </div>

      {/* Live Preview */}
      <div className="rounded-xl p-6 border border-slate-700 shadow-inner transition-all duration-500 bg-slate-800">
        <div className="font-bold mb-2 text-white text-lg">MacSunny Electronics</div>
        <p className="text-sm text-gray-400 mb-4">
          Preview how your theme will look across the system.
        </p>
        <div className="flex gap-3">
          <button
            style={{ backgroundColor: theme.accent }}
            className="px-4 py-2 rounded text-white font-semibold"
          >
            Primary Button
          </button>
          <button className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-white">
            Secondary
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
        <p className="text-sm text-blue-200">
          💡 <strong>Tip:</strong> Theme changes are saved automatically and persist across sessions.
        </p>
      </div>
    </section>
  );
}
