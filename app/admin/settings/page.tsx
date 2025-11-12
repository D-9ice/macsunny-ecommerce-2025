// app/admin/settings/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MongoStatus from '../../components/MongoStatus'; // adjust path if needed
import ThemeCustomizer from './ThemeCustomizer';
import ThemeToggle from '../../../components/ThemeToggle';

type ThemeMode = 'dark' | 'light' | 'premium';

type ThemeSettings = {
  mode: ThemeMode;
  accent: string;
  fontScale: number;
  container: 'narrow' | 'normal' | 'wide';
  rounded: boolean;
};

const LS_KEY = 'ms_theme_settings';

function defaultSettings(): ThemeSettings {
  return {
    mode: 'dark',
    accent: '#16a34a',
    fontScale: 1,
    container: 'normal',
    rounded: true,
  };
}

async function fetchJsonSafe(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

function applyThemeToDocument(s: ThemeSettings) {
  const root = document.documentElement;
  root.classList.remove('theme-dark', 'theme-light', 'theme-premium');
  root.classList.add(`theme-${s.mode}`);
  root.style.setProperty('--ms-accent', s.accent);
  root.style.setProperty('--ms-font-scale', String(s.fontScale));
  root.style.setProperty('--ms-rounded', s.rounded ? '0.75rem' : '0.125rem');
}

function saveToLocal(s: ThemeSettings) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}
function loadFromLocal(): ThemeSettings | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ThemeSettings;
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

  const [theme, setTheme] = useState<ThemeSettings>(defaultSettings());
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>({ products: 0, orders: 0, categories: 0, environment: 'Development', memBytes: 0, dbUptimeSec: 0 });

  useEffect(() => {
    const local = loadFromLocal();
    const init = local ?? defaultSettings();
    setTheme(init);
    applyThemeToDocument(init);
  }, []);

  useEffect(() => {
    async function loadStats() {
      const apiStats = await fetchJsonSafe('/api/stats');
      if (apiStats) {
        setStats({
          products: apiStats.products ?? 0,
          orders: apiStats.orders ?? 0,
          categories: apiStats.categories ?? 0,
          environment: apiStats.environment ?? 'Production',
          memBytes: apiStats.memBytes ?? 0,
          dbUptimeSec: apiStats.dbUptimeSec ?? 0,
        });
        return;
      }
      const prodRes = await fetchJsonSafe('/api/products');
      const ordersRes = await fetchJsonSafe('/api/orders');
      setStats({
        products: prodRes?.products?.length ?? 0,
        orders: ordersRes?.orders?.length ?? 0,
        categories: 0,
        environment: 'Development',
        memBytes: (performance as any)?.memory?.usedJSHeapSize ?? 0,

        dbUptimeSec: 0,
      });
    }
    loadStats();
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
    saveToLocal(theme);
  }, [theme]);

  const onSaveClick = async () => {
    setSaving(true);
    try {
      saveToLocal(theme);
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      });
    } catch {}
    setSaving(false);
  };

  const onResetDefaults = () => {
    const def = defaultSettings();
    setTheme(def);
    applyThemeToDocument(def);
    saveToLocal(def);
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">System Settings</h1>
          <Link href="/admin/dashboard" className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700">
            Back to Dashboard
          </Link>
        </div>

        {/* Theme Toggle - Positioned for easy access */}
        <div className="mb-6">
          <ThemeToggle />
        </div>

        <MongoStatus />

        <div className="mt-6 rounded-lg bg-slate-900/60 border border-slate-700 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><div className="text-sm text-gray-300">Products</div><div className="text-2xl font-semibold">{stats.products}</div></div>
          <div><div className="text-sm text-gray-300">Orders</div><div className="text-2xl font-semibold">{stats.orders}</div></div>
          <div><div className="text-sm text-gray-300">Categories</div><div className="text-2xl font-semibold">{stats.categories}</div></div>
          <div><div className="text-sm text-gray-300">Environment</div><div className="text-xl">{stats.environment}</div></div>
          <div><div className="text-sm text-gray-300">Memory Usage</div><div className="text-xl">{prettyBytes(stats.memBytes)}</div></div>
          <div><div className="text-sm text-gray-300">DB Uptime</div><div className="text-xl">{prettySeconds(stats.dbUptimeSec)}</div></div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="col-span-1 bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Theme & Appearance</h2>
            <div className="mb-4">
              <label className="block text-sm mb-2">Mode</label>
              <div className="flex gap-2">
                {(['dark','light','premium'] as ThemeMode[]).map(m => (
                  <button key={m} onClick={()=>setTheme(t=>({...t,mode:m}))}
                    className={`px-3 py-2 rounded ${theme.mode===m?'ring-2 ring-offset-1':'opacity-80'} ${m==='premium'?'bg-gradient-to-r from-purple-600 to-pink-500':'bg-gray-800'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-2">Accent Color</label>
              <input type="color" value={theme.accent} onChange={e=>setTheme(t=>({...t,accent:e.target.value}))} />
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-2">Font Scale ({theme.fontScale.toFixed(2)}x)</label>
              <input type="range" min={0.8} max={1.3} step={0.01} value={theme.fontScale} onChange={e=>setTheme(t=>({...t,fontScale:Number(e.target.value)}))} className="w-full" />
            </div>
            <div className="mb-6">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={theme.rounded} onChange={e=>setTheme(t=>({...t,rounded:e.target.checked}))} />
                <span className="text-sm">Rounded corners</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={onSaveClick} disabled={saving} className="px-4 py-2 bg-green-700 rounded hover:bg-green-800 disabled:opacity-60">{saving?'Saving...':'Save'}</button>
              <button onClick={onResetDefaults} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Reset</button>
            </div>
          </section>

          <section className="col-span-1 bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Live Preview</h2>
            <div className="rounded p-4" style={{background:theme.mode==='light'?'#f7fafc':theme.mode==='premium'?'linear-gradient(180deg,#0f172a,#00121f)':'#0b1220',color:theme.mode==='light'?'#111827':'#e6eef8',borderRadius:theme.rounded?12:4,transform:`scale(${theme.fontScale})`}}>
              <div className="flex items-center gap-3">
                <div style={{width:44,height:44,background:'var(--ms-accent)',borderRadius:8}} />
                <div>
                  <div style={{fontWeight:700}}>MacSunny Electronics</div>
                  <div style={{fontSize:12,opacity:0.8}}>Home of Electronics Components</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div style={{background:'#071025',padding:12,borderRadius:theme.rounded?8:4}}><div style={{fontWeight:600}}>Resistor 10kΩ</div><div style={{fontSize:12,opacity:0.8}}>GHS 1.00</div></div>
                <div style={{background:'#071025',padding:12,borderRadius:theme.rounded?8:4}}><div style={{fontWeight:600}}>Capacitor 470uF</div><div style={{fontSize:12,opacity:0.8}}>GHS 35.00</div></div>
              </div>
              <div className="mt-4">
                <button style={{background:'var(--ms-accent)',border:'none',padding:'8px 12px',borderRadius:6,color:'white',fontWeight:700}}>Add to Cart</button>
              </div>
            </div>
          </section>

                    {/* 🧰 System Tools + Live MongoDB Status */}
          <section className="col-span-1 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg shadow-black/30">
            <h2 className="text-xl font-semibold mb-4">System Tools & Status</h2>
            <div className="space-y-4">
              <button
                onClick={() => fetch('/api/db-status')}
                className="w-full px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-all font-semibold"
              >
                Test Database Connection
              </button>

              <button
                onClick={() => console.log('Theme settings:', theme)}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
              >
                Debug: Export Current Theme
              </button>

              <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-4 shadow-inner">
                <MongoStatus />
              </div>
            </div>
          </section>

          {/* 🎨 Advanced Theme Customizer */}
          <section className="col-span-1 lg:col-span-3 mt-8 bg-gray-900/60 border border-gray-800 rounded-xl p-8 text-white shadow-lg shadow-black/40">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              🎨 Theme & Appearance
            </h2>
            <p className="text-gray-400 mb-6">
              Adjust the look and feel of the MacSunny system in real-time.
              Changes apply instantly across all pages.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Mode Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Theme Mode</h3>
                <div className="flex gap-3">
                  {(['light', 'dark', 'premium'] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTheme((t) => ({ ...t, mode }))}
                      className={`px-4 py-2 rounded-lg font-semibold capitalize transition-all ${
                        theme.mode === mode
                          ? 'bg-green-700 ring-2 ring-green-400 shadow-md'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color Picker */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Accent Color</h3>
                <input
                  type="color"
                  value={theme.accent}
                  onChange={(e) =>
                    setTheme((t) => ({ ...t, accent: e.target.value }))
                  }
                  className="w-20 h-10 rounded-lg border border-gray-700 cursor-pointer"
                />
                <p className="text-sm text-gray-400 mt-1">{theme.accent}</p>
              </div>

              {/* Font Scale */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Font Scale</h3>
                <input
                  type="range"
                  min={0.8}
                  max={1.3}
                  step={0.01}
                  value={theme.fontScale}
                  onChange={(e) =>
                    setTheme((t) => ({ ...t, fontScale: Number(e.target.value) }))
                  }
                  className="w-full accent-green-600"
                />
                <p className="text-sm text-gray-400 mt-1">
                  {theme.fontScale.toFixed(2)}x
                </p>
              </div>
            </div>

            {/* Rounded Corners */}
            <div className="mt-6 flex items-center gap-3">
              <input
                type="checkbox"
                checked={theme.rounded}
                onChange={(e) =>
                  setTheme((t) => ({ ...t, rounded: e.target.checked }))
                }
                id="rounded-toggle"
                className="w-5 h-5 text-green-600 rounded border-gray-600"
              />
              <label htmlFor="rounded-toggle" className="text-sm">
                Rounded Corners
              </label>
            </div>

            {/* Live Preview */}
            <div className="mt-8 bg-gray-800 rounded-xl p-6 shadow-inner">
              <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
              <div
                className="rounded-lg p-6 transition-all duration-300"
                style={{
                  backgroundColor:
                    theme.mode === 'light'
                      ? '#f7fafc'
                      : theme.mode === 'premium'
                      ? '#1a1200'
                      : '#0b1220',
                  color: theme.mode === 'light' ? '#111' : '#fff',
                  borderRadius: theme.rounded ? '12px' : '4px',
                  transform: `scale(${theme.fontScale})`,
                }}
              >
                <div className="font-semibold text-lg mb-3">MacSunny Components</div>
                <div className="flex gap-3 mb-3">
                  <button
                    style={{
                      backgroundColor: theme.accent,
                      color: theme.mode === 'light' ? '#000' : '#fff',
                    }}
                    className="px-4 py-2 rounded-md font-semibold shadow"
                  >
                    Add to Cart
                  </button>
                  <button
                    style={{
                      backgroundColor:
                        theme.mode === 'premium' ? '#fbbf24' : theme.accent,
                    }}
                    className="px-4 py-2 rounded-md font-semibold shadow"
                  >
                    View Details
                  </button>
                </div>
                <p className="text-gray-300 text-sm">
                  Accent and mode changes are applied globally.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onSaveClick}
                disabled={saving}
                className="px-6 py-2 bg-green-700 hover:bg-green-800 rounded-lg font-semibold transition-all disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
                            <button
                onClick={onResetDefaults}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all"
              >
                Reset Defaults
              </button>
            </div>
          </section>

          {/* 🎨 Inserted Theme Customizer Panel Below System Tools */}
          <ThemeCustomizer />

        </div>
      </div>
    </main>
  );
}

