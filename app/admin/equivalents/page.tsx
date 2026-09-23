'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AdminWorkspace from '@/app/admin/components/AdminWorkspace';

interface Equivalent {
  _id: string;
  primary_sku: string;
  primary_name?: string;
  primary_mpn?: string;
  primary_description?: string;
  primary_datasheet_url?: string;
  primary_reference_url?: string;
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
  const [mouserConfigured, setMouserConfigured] = useState(false);

  useEffect(() => {
    loadEquivalents();
    checkProviderConfig();
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

  const checkProviderConfig = async () => {
    try {
      const [nexarRes, mouserRes] = await Promise.all([
        fetch('/api/equivalents/nexar', { cache: 'no-store' }),
        fetch('/api/equivalents/mouser', { cache: 'no-store' }),
      ]);
      const nexar = await nexarRes.json();
      const mouser = await mouserRes.json();
      setNexarConfigured(Boolean(nexar.configured));
      setMouserConfigured(Boolean(mouser.configured));
    } catch (error) {
      console.error('Failed to check external provider config:', error);
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

        {/* Plain-language search readiness */}
        <div className={`mb-6 rounded-lg border p-4 ${(nexarConfigured || mouserConfigured) ? 'border-green-500/30 bg-green-900/20' : 'border-yellow-500/30 bg-yellow-900/20'}`}>
          <div className="flex items-start gap-2">
            <span className="text-xl">{(nexarConfigured || mouserConfigured) ? '✅' : '⚠️'}</span>
            <div>
              <p className="font-semibold">
                {(nexarConfigured || mouserConfigured) ? 'Component Search Ready' : 'Component Search Needs Attention'}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Search MacSunny inventory and external component references below.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className={`rounded-full border px-2.5 py-1 ${nexarConfigured ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                  Nexar • Paid service • {nexarConfigured ? 'Available' : 'Needs attention'}
                </span>
                <span className={`rounded-full border px-2.5 py-1 ${mouserConfigured ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' : 'border-slate-600 bg-slate-800 text-slate-300'}`}>
                  Mouser • {mouserConfigured ? 'Available' : 'Access pending'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Billing and renewal details are tracked under{' '}
                <Link href="/admin/services-renewals" className="font-semibold text-amber-300 hover:text-amber-200">
                  Services & Renewals
                </Link>.
              </p>
            </div>
          </div>
        </div>

        {/* Test Search */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-xl font-bold mb-4">🔍 Component Search</h2>
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

          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Direct research:</span>

            <a
              href={
                testSKU.trim()
                  ? 'https://www.alldatasheet.net/view.jsp?Searchword=' + encodeURIComponent(testSKU.trim())
                  : 'https://www.alldatasheet.net/'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 font-semibold text-blue-300 hover:bg-blue-500/20 hover:text-blue-200"
            >
              AllDatasheet ↗
            </a>

            <a
              href={
                testSKU.trim()
                  ? 'https://www.mouser.com/c/?q=' + encodeURIComponent(testSKU.trim())
                  : 'https://www.mouser.com/'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 font-semibold text-green-300 hover:bg-green-500/20 hover:text-green-200"
            >
              Mouser ↗
            </a>

            <a
              href={
                testSKU.trim()
                  ? 'https://www.digikey.com/en/products?keywords=' + encodeURIComponent(testSKU.trim())
                  : 'https://www.digikey.com/'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-semibold text-red-300 hover:bg-red-500/20 hover:text-red-200"
            >
              DigiKey ↗
            </a>

            <a
              href={
                testSKU.trim()
                  ? 'https://octopart.com/search?q=' + encodeURIComponent(testSKU.trim())
                  : 'https://octopart.com/'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 font-semibold text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
            >
              Octopart ↗
            </a>
          </div>

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
                    {(source.primary_datasheet_url || source.primary_reference_url) && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {source.primary_datasheet_url && (
                          <a href={source.primary_datasheet_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500">
                            Open Datasheet
                          </a>
                        )}
                        {source.primary_reference_url && (
                          <a href={source.primary_reference_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-600">
                            Provider Reference
                          </a>
                        )}
                      </div>
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
                  ? <p className="text-slate-400">MacSunny has this component in inventory. No equivalent alternatives are currently available from the connected reference providers.</p>
                  : (testResult.cached_equivalents || testResult.external_equivalents)
                    ? <p className="text-slate-400">Component identified. No equivalent alternatives are currently available from the connected reference providers.</p>
                    : <div className="flex flex-wrap items-center gap-2 text-slate-400">
                        <span>No matching component or equivalent alternatives were found.</span>
                        <a
                          href={'https://www.alldatasheet.net/view.jsp?Searchword=' + encodeURIComponent(testSKU.trim())}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-300 hover:text-blue-200"
                        >
                          Search AllDatasheet manually
                        </a>
                      </div>
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

                  {(equiv.primary_datasheet_url || equiv.primary_reference_url) && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {equiv.primary_datasheet_url && (
                        <a href={equiv.primary_datasheet_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500">
                          Open Datasheet
                        </a>
                      )}
                      {equiv.primary_reference_url && (
                        <a href={equiv.primary_reference_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-600">
                          Provider Reference
                        </a>
                      )}
                    </div>
                  )}

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