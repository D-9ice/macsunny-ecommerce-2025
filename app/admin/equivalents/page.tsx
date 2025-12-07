'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Equivalent {
  _id: string;
  primary_sku: string;
  primary_name?: string;
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
  const [octopartConfigured, setOctopartConfigured] = useState(false);

  useEffect(() => {
    loadEquivalents();
    checkOctopartConfig();
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

  const checkOctopartConfig = async () => {
    try {
      const res = await fetch('/api/equivalents/octopart');
      const data = await res.json();
      setOctopartConfigured(data.configured);
    } catch (error) {
      console.error('Failed to check Octopart config:', error);
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
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Component Equivalents Manager</h1>
            <p className="text-gray-400">Manage component cross-references with Octopart integration</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Configuration Status */}
        <div className={`mb-6 p-4 rounded-lg ${octopartConfigured ? 'bg-green-900/20 border border-green-500/30' : 'bg-yellow-900/20 border border-yellow-500/30'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{octopartConfigured ? '✅' : '⚠️'}</span>
            <div>
              <p className="font-semibold">
                {octopartConfigured ? 'Octopart API Configured' : 'Octopart API Not Configured'}
              </p>
              {!octopartConfigured && (
                <p className="text-sm text-gray-400 mt-1">
                  Set <code className="bg-gray-800 px-1 rounded">OCTOPART_API_KEY</code> environment variable to enable external component search
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Test Search */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
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
                  {testResult.summary?.total_results || 0} result(s) found
                </p>
                {testResult.summary && (
                  <div className="ml-auto flex gap-2 text-xs">
                    {testResult.summary.cache_used && <span className="bg-purple-600 px-2 py-1 rounded">Cached</span>}
                    {testResult.summary.api_called && <span className="bg-blue-600 px-2 py-1 rounded">API Called</span>}
                  </div>
                )}
              </div>

              {/* Local Inventory */}
              {testResult.found_in_inventory?.length > 0 && (
                <div className="mb-3">
                  <p className="font-semibold text-green-400 mb-2">📦 In Stock:</p>
                  <div className="space-y-1">
                    {testResult.found_in_inventory.map((p: any, i: number) => (
                      <div key={i} className="bg-gray-800 p-2 rounded">
                        <span className="font-mono text-blue-300">{p.sku}</span>: {p.name} - GHS {p.price}
                        {p.equivalent_of && <span className="text-yellow-400 ml-2">(alt. to {p.equivalent_of})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Equivalents */}
              {(testResult.cached_equivalents || testResult.external_equivalents) && (
                <div>
                  <p className="font-semibold text-blue-400 mb-2">
                    🔗 Known Equivalents:
                  </p>
                  <div className="space-y-1">
                    {(testResult.cached_equivalents?.equivalents || testResult.external_equivalents?.equivalents || []).slice(0, 5).map((eq: any, i: number) => (
                      <div key={i} className="bg-gray-800 p-2 rounded text-xs">
                        <span className="font-mono text-blue-300">{eq.mpn}</span> by {eq.manufacturer}
                        {eq.in_stock_external && <span className="text-green-400 ml-2">✓ Available ({eq.distributor})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {testResult.summary?.total_results === 0 && (
                <p className="text-gray-400">No matches found in inventory or component database.</p>
              )}
            </div>
          )}
        </div>

        {/* Cached Equivalents List */}
        <div className="bg-gray-800 rounded-lg p-6">
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
            <p className="text-gray-400">Loading...</p>
          ) : equivalents.length === 0 ? (
            <p className="text-gray-400">No cached equivalents yet. Test a search above to populate the cache.</p>
          ) : (
            <div className="space-y-3">
              {equivalents.map((equiv) => (
                <div key={equiv._id} className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg font-mono text-blue-300">{equiv.primary_sku}</h3>
                      {equiv.primary_name && <p className="text-sm text-gray-400">{equiv.primary_name}</p>}
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs bg-purple-600 px-2 py-1 rounded">
                        {equiv.source}
                      </span>
                      <span className="text-xs text-gray-400">
                        {equiv.cache_age_days}d ago
                      </span>
                      <button
                        onClick={() => deleteEquivalent(equiv.primary_sku)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="text-gray-400 mb-1">Equivalents ({equiv.equivalents.length}):</p>
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

        {/* Usage Info */}
        <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="font-bold mb-3">💡 How It Works</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>User searches for a component (via AI chat or direct search)</li>
            <li>System checks MacSunny local inventory first</li>
            <li>If no match, checks cached equivalents (90-day TTL)</li>
            <li>If cache miss, queries Octopart API for industry-standard equivalents</li>
            <li>Results are cached for 90 days to reduce API calls by ~90%</li>
            <li>Future searches for the same component use cached data instantly</li>
          </ol>
          <p className="mt-4 text-xs text-gray-400">
            <strong>API Usage:</strong> Octopart free tier allows 1000 requests/month. 
            With caching, this supports ~30,000 searches/month for popular components.
          </p>
        </div>
      </div>
    </div>
  );
}
