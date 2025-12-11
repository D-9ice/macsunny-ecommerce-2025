'use client';

import { useState, useEffect } from 'react';
import { getVisitStats, formatVisitCount, type VisitStats } from '@/app/lib/analytics';

export default function VisitCounter() {
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadStats();
    // Refresh stats every 5 minutes
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setError(false);
      const data = await getVisitStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load visit stats:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-gray-800 p-6 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Visitor Analytics
        </h3>
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 text-center">
          <p className="text-yellow-300 text-sm">
            Analytics temporarily unavailable
          </p>
          <button
            onClick={loadStats}
            className="mt-2 text-xs text-blue-400 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
        <span className="text-2xl">📊</span>
        Visitor Analytics
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Visits */}
        <div className="bg-black/60 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Total Visits</p>
          <p className="text-2xl font-bold text-white">{formatVisitCount(stats.totalVisits)}</p>
        </div>

        {/* Unique Visitors */}
        <div className="bg-black/60 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Unique Visitors</p>
          <p className="text-2xl font-bold text-green-400">{formatVisitCount(stats.uniqueVisitors)}</p>
        </div>

        {/* Today */}
        <div className="bg-black/60 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Today</p>
          <p className="text-2xl font-bold text-yellow-400">{formatVisitCount(stats.todayVisits)}</p>
        </div>

        {/* This Month */}
        <div className="bg-black/60 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">This Month</p>
          <p className="text-2xl font-bold text-blue-400">{formatVisitCount(stats.thisMonthVisits)}</p>
        </div>
      </div>

      {/* Top Pages */}
      {stats.topPages.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-gray-400 text-sm mb-2">Top Pages</p>
          <div className="space-y-2">
            {stats.topPages.slice(0, 5).map((item, index) => (
              <div key={item.page} className="flex items-center gap-2">
                <span className="text-gray-500 text-xs w-4">{index + 1}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all"
                    style={{
                      width: `${(item.views / stats.topPages[0].views) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-white text-xs font-medium w-20 text-right">
                  {formatVisitCount(item.views)} views
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-gray-500 text-xs mt-4">
        Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
      </p>
    </div>
  );
}
