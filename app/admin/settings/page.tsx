'use client';

import React, { useEffect, useState } from 'react';
import MongoStatus from '../../components/MongoStatus';
import ThemeToggle from '../../../components/ThemeToggle';
import AdminWorkspace from '@/app/admin/components/AdminWorkspace';
import { useTheme, type ThemeMode } from '@/app/context/ThemeContext';
import type { ThemeContainer } from '@/app/lib/siteTheme';

async function fetchJsonSafe(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

function prettyBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function prettySeconds(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s}s`;
}

export default function SettingsPage(): React.JSX.Element {
  const { theme, updateTheme, saveTheme, resetTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<any>({
    products: 0,
    orders: 0,
    categories: 0,
    environment: 'Development',
    memBytes: 0,
    dbUptimeSec: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const apiStats = await fetchJsonSafe('/api/db-status', { cache: 'no-store' });
      if (!apiStats || apiStats.status !== 'connected') return;

      setStats({
        products: apiStats.products ?? 0,
        orders: apiStats.orders ?? 0,
        categories: apiStats.categories ?? 0,
        environment: apiStats.environment ?? 'Production',
        memBytes: apiStats.memBytes ?? 0,
        dbUptimeSec: apiStats.dbUptimeSec ?? 0,
      });
    }

    void loadStats();
  }, []);

  const onSaveClick = async () => {
    setSaving(true);
    setMessage('');
    const ok = await saveTheme();
    setSaving(false);
    setMessage(ok
      ? 'Theme published successfully. Storefront visitors will receive these settings.'
      : 'Theme could not be published. The previous storefront theme remains active.');
  };

  const onResetDefaults = () => {
    resetTheme();
    setMessage('Default theme loaded in preview. Click Save Changes to publish it.');
  };

  return (
    <AdminWorkspace title="System Settings" subtitle="Global storefront theme and live system status">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-amber-100">Global Theme Mode</h2>
              <p className="mt-1 text-sm text-slate-400">
                Preview instantly here, then publish one authoritative theme for all storefront visitors.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        <MongoStatus />

        <section className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-5 md:grid-cols-3 xl:grid-cols-6">
          <div><div className="text-xs text-slate-400">Products</div><div className="text-xl font-semibold">{stats.products}</div></div>
          <div><div className="text-xs text-slate-400">Orders</div><div className="text-xl font-semibold">{stats.orders}</div></div>
          <div><div className="text-xs text-slate-400">Categories</div><div className="text-xl font-semibold">{stats.categories}</div></div>
          <div><div className="text-xs text-slate-400">Environment</div><div className="text-base font-semibold">{stats.environment}</div></div>
          <div><div className="text-xs text-slate-400">Memory Usage</div><div className="text-base font-semibold">{prettyBytes(stats.memBytes)}</div></div>
          <div><div className="text-xs text-slate-400">DB Uptime</div><div className="text-base font-semibold">{prettySeconds(stats.dbUptimeSec)}</div></div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr_.9fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-xl font-bold text-amber-100">Theme & Appearance</h2>
            <p className="mt-1 text-sm text-slate-400">These values are the global storefront configuration.</p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold">Mode</label>
                <div className="flex flex-wrap gap-2">
                  {(['light', 'dark', 'premium'] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateTheme({ mode })}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${theme.mode === mode ? 'bg-violet-600 text-white ring-2 ring-violet-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.accent}
                    onChange={(event) => updateTheme({ accent: event.target.value })}
                    className="h-11 w-20 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-1"
                  />
                  <code className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-slate-300">{theme.accent}</code>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Font Scale ({theme.fontScale.toFixed(2)}×)</label>
                <input
                  type="range"
                  min={0.8}
                  max={1.3}
                  step={0.01}
                  value={theme.fontScale}
                  onChange={(event) => updateTheme({ fontScale: Number(event.target.value) })}
                  className="w-full accent-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Content Width</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['narrow', 'normal', 'wide'] as ThemeContainer[]).map((container) => (
                    <button
                      key={container}
                      onClick={() => updateTheme({ container })}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${theme.container === container ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      {container}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={theme.rounded}
                  onChange={(event) => updateTheme({ rounded: event.target.checked })}
                  className="h-5 w-5 accent-violet-500"
                />
                <span className="text-sm font-semibold">Rounded storefront corners</span>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-800 pt-5">
              <button
                onClick={onSaveClick}
                disabled={saving}
                className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold hover:bg-emerald-600 disabled:opacity-60"
              >
                {saving ? 'Publishing…' : 'Save Changes'}
              </button>
              <button
                onClick={onResetDefaults}
                className="rounded-lg bg-slate-800 px-5 py-2.5 font-semibold hover:bg-slate-700"
              >
                Reset Defaults
              </button>
            </div>

            {message ? (
              <div className={`mt-4 rounded-xl border p-3 text-sm ${message.startsWith('Theme published') ? 'border-emerald-700 bg-emerald-950/40 text-emerald-200' : 'border-amber-700 bg-amber-950/30 text-amber-100'}`}>
                {message}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-xl font-bold text-amber-100">Live Preview</h2>
            <p className="mt-1 text-sm text-slate-400">Preview uses the same canonical values as the storefront.</p>

            <div
              className="mt-6 border p-5 transition-all"
              style={{
                background:
                  theme.mode === 'light'
                    ? '#f4f7f5'
                    : theme.mode === 'dark'
                      ? '#0b1220'
                      : 'linear-gradient(145deg,#08251b,#03110c)',
                color: theme.mode === 'light' ? '#102018' : '#eafff5',
                borderColor: theme.accent,
                borderRadius: theme.rounded ? 16 : 2,
                fontSize: `${theme.fontScale}rem`,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg" style={{ backgroundColor: theme.accent }} />
                <div>
                  <div className="font-bold">MacSunny Electronics</div>
                  <div className="text-xs opacity-70">Storefront theme preview</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-black/20 p-3">
                  <div className="font-semibold">IRFP460</div>
                  <div className="text-xs opacity-70">Power MOSFET</div>
                </div>
                <div className="rounded-lg bg-black/20 p-3">
                  <div className="font-semibold">LM358</div>
                  <div className="text-xs opacity-70">Integrated Circuit</div>
                </div>
              </div>

              <button
                className="mt-5 rounded-lg px-4 py-2 font-bold text-white"
                style={{ backgroundColor: theme.accent, borderRadius: theme.rounded ? 9 : 2 }}
              >
                Storefront Action
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-xl font-bold text-amber-100">System Tools & Status</h2>
            <div className="mt-5 space-y-4">
              <button
                onClick={() => void fetch('/api/db-status', { cache: 'no-store' })}
                className="w-full rounded-lg bg-indigo-700 px-4 py-2.5 font-semibold hover:bg-indigo-600"
              >
                Test Database Connection
              </button>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <MongoStatus />
              </div>
              <div className="rounded-xl border border-blue-800 bg-blue-950/30 p-4 text-sm text-blue-100">
                Published theme settings are stored server-side and are loaded by the public storefront for every visitor.
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminWorkspace>
  );
}
