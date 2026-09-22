'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import AdminWorkspace from '@/app/admin/components/AdminWorkspace';

interface Equivalent {
  _id: string;
  primary_sku: string;
  primary_name?: string;
  primary_mpn?: string;
  primary_description?: string;
  primary_specs?: Record<string, string>;
  equivalents: Array<{
    mpn: string;
    manufacturer: string;
    description: string;
    in_stock_external: boolean;
    distributor: string;
  }>;
  source: string;
  cached_at: string;
  cache_age_days?: number;
  expires_in_days?: number;
}

export default function EquivalentsManager() {
  const [equivalents, setEquivalents] = useState<Equivalent[]>([]);
  const [loading, setLoading] = useState(true);
  const [testSKU, setTestSKU] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [nexarConfigured, setNexarConfigured] = useState(false);
  const [publicLookupEnabled, setPublicLookupEnabled] = useState(false);

  useEffect(() => {
    loadEquivalents();
    checkNexarConfig();
  }, []);

  const loadEquivalents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/equivalents');
      const data = await res.json();
      
      if (data.success) {
        setEquivalents(data.equivalents || []);
      }
    } catch (error) {
      console.error('Failed to load equivalents:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNexarConfig = async () => {
    try {
      const res = await fetch('/api/equivalents/nexar', { cache: 'no-store' });
      const data = await res.json();
      setNexarConfigured(Boolean(data.configured));
      setPublicLookupEnabled(Boolean(data.public_lookup_enabled));
    } catch (error) {
      console.error('Failed to check Nexar config:', error);
    }
  };

  const testSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSKU.trim()) return;

    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/equivalents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: testSKU.trim(),
          includeExternal: true 
        }),
      });

      const data = await res.json();
      setTestResult(data);
      
      // Reload cache after search (it might have been updated)
      if (data.summary?.api_called) {
        setTimeout(loadEquivalents, 1000);
      }
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const deleteEquivalent = async (sku: string) => {
    if (!confirm(`Delete cached equivalents for ${sku}?`)) return;

    try {
      await fetch(`/api/equivalents?sku=${sku}`, { method: 'DELETE' });
      loadEquivalents();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <AdminWorkspace title="Component Equivalents" subtitle="Manage cached cross-references and external lookup">
      <div className="space-y-6">

        {/* Configuration Status */}
        <div className={`mb-6 p-4 rounded-lg ${nexarConfigured ? 'bg-green-900/20 border border-green-500/30' : 'bg-yellow-900/20 border border-yellow-500/30'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{nexarConfigured ? '✅' : '⚠️'}</span>
            <div>
              <p className="font-semibold">
                {nexarConfigured ? 'External Component Lookup Connected' : 'External Component Lookup Not Connected'}
              </p>
              {!nexarConfigured && (
                <p className="text-sm text-slate-400 mt-1">
                  Cached equivalents remain available. Complete the Nexar connection to enable live external component searches.
                </p>
              )}
              {nexarConfigured && (
                <p className="text-sm text-slate-400 mt-1">
                  Admin searches can use Nexar and the local cache. Customer live lookup is <strong>{publicLookupEnabled ? 'enabled' : 'disabled'}</strong>.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Test Search */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-bold mb-4">🔍 Test Component Search</h2>
          <form onSubmit={testSearch} className="flex gap-3 mb-4">
            <input
              type="text"
              value={testSKU}
              onChange={(e) => setTestSKU(e.target.value)}
              placeholder="Enter component SKU (e.g., 1N4148, BC547, LM7805)"
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={testLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
            >
              {testLoading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {testResult && (
            <div className="bg-gray-900 rounded-lg p-4 text-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{testResult.success ? '✅' : '❌'}</span>
                <p className="font-semibold">
                  {(() => {
                    const localCount = testResult.found_in_inventory?.length || 0;
                    const equivalentCount = (testResult.cached_equivalents?.equivalents || testResult.external_equivalents?.equivalents || []).length;
                    const total = localCount + equivalentCount;
                    return `${total} result${total === 1 ? '' : 's'} found`;
                  })()}
                </p>
                {testResult.summary && (
                  <div className="ml-auto flex gap-2 text-xs">
                    {testResult.summary.cache_used && <span className="bg-purple-600 px-2 py-1 rounded">Cached</span>}
                    {testResult.summary.api_called && <span className="bg-blue-600 px-2 py-1 rounded">API Called</span>}
                  </div>
                )}
              </div>

              {testResult.found_in_inventory?.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 font-semibold text-emerald-400">MacSunny Inventory</p>
                  <div className="space-y-2">
                    {testResult.found_in_inventory.map((product: any) => (
                      <div key={product.sku} className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white p-1">
                          <Image
                            src={product.image || '/macsunny-logo.png'}
                            alt={product.name || product.sku}
                            width={64}
                            height={64}
                            unoptimized
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-emerald-200">{product.sku}</span>
                            {product.mpn && product.mpn.toUpperCase() !== product.sku.toUpperCase() && <span className="font-mono text-xs text-slate-400">{product.mpn}</span>}
                            <span className="rounded bg-emerald-600/20 px-2 py-0.5 text-xs text-emerald-300">In MacSunny inventory</span>
                          </div>
                          <p className="mt-1 font-medium text-slate-100">{product.name}</p>
                          {product.description && <p className="mt-1 text-xs leading-5 text-slate-400">{product.description}</p>}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                            {product.package && <span>Package: {product.package}</span>}
                            {product.pinCount && <span>Pins: {product.pinCount}</span>}
                            <span>Stock: {product.quantity ?? 0}</span>
                            <span>GHS {Number(product.price || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(testResult.cached_equivalents || testResult.external_equivalents) && (() => {
                const source = testResult.cached_equivalents || testResult.external_equivalents;
                const specs = Object.entries(source.primary_specs || {}).slice(0, 8);
                return (
                  <div>
                    {source.primary_mpn && source.primary_sku && source.primary_mpn.toUpperCase() !== source.primary_sku.toUpperCase() && (
                      <p className="mb-2 text-xs font-mono text-slate-400">
                        Recognized as {source.primary_mpn}
                      </p>
                    )}
                    {source.primary_description && (
                      <p className="mb-3 text-sm leading-6 text-slate-300">{source.primary_description}</p>
                    )}
                    {specs.length > 0 && (
                      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {specs.map(([label, value]) => (
                          <div key={label} className="rounded-lg bg-slate-800 px-3 py-2">
                            <span className="block text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
                            <span className="text-sm text-slate-100">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mb-2 font-semibold text-blue-400">Equivalent Part Numbers</p>
                  <div className="flex flex-wrap gap-2">
                    {(testResult.cached_equivalents?.equivalents || testResult.external_equivalents?.equivalents || []).slice(0, 10).map((eq: any, i: number) => (
                      <span key={i} className="rounded-lg bg-slate-800 px-3 py-2 font-mono text-sm font-semibold text-blue-200">
                        {eq.mpn}
                      </span>
                    ))}
                  </div>
                  </div>
                );
              })()}

              {(testResult.cached_equivalents?.equivalents || testResult.external_equivalents?.equivalents || []).length === 0 && (
                testResult.found_in_inventory?.length > 0
                  ? <p className="text-slate-400">MacSunny has this component in inventory. No equivalent alternatives are currently available from Nexar.</p>
                  : (testResult.cached_equivalents || testResult.external_equivalents)
                    ? <p className="text-slate-400">Component identified. No equivalent alternatives are currently available from Nexar for this part.</p>
                    : <p className="text-slate-400">No matching component or equivalent alternatives were found.</p>
              )}
            </div>
          )}
        </div>

        {/* Cached Equivalents List */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">💾 Cached Equivalents ({equivalents.length})</h2>
            <button
              onClick={loadEquivalents}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-slate-400">Loading...</p>
          ) : equivalents.length === 0 ? (
            <p className="text-slate-400">No cached equivalents yet. Test a search above to populate the cache.</p>
          ) : (
            <div className="space-y-3">
              {equivalents.map((equiv) => (
                <div key={equiv._id} className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-lg font-mono text-blue-300">{equiv.primary_sku}</h3>
                        {equiv.primary_mpn && equiv.primary_mpn.toUpperCase() !== equiv.primary_sku.toUpperCase() && (
                          <span className="rounded bg-slate-800 px-2 py-1 text-xs font-mono text-slate-300">
                            {equiv.primary_mpn}
                          </span>
                        )}
                      </div>
                      {(equiv.primary_description || equiv.primary_name) && (
                        <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-300">
                          {equiv.primary_description || equiv.primary_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => deleteEquivalent(equiv.primary_sku)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {equiv.primary_specs && Object.keys(equiv.primary_specs).length > 0 && (
                    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {Object.entries(equiv.primary_specs).slice(0, 8).map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-slate-800 px-3 py-2">
                          <span className="block text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
                          <span className="text-sm text-slate-100">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-sm">
                    <p className="text-slate-400 mb-1">Equivalents ({equiv.equivalents.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {equiv.equivalents.slice(0, 8).map((eq, i) => (
                        <span key={i} className="bg-gray-800 px-2 py-1 rounded text-xs">
                          {eq.mpn}
                        </span>
                      ))}
                      {equiv.equivalents.length > 8 && (
                        <span className="text-gray-500 text-xs">+{equiv.equivalents.length - 8} more</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminWorkspace>
  );
}