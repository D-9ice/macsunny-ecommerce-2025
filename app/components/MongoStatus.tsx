'use client';

import { useEffect, useState } from 'react';

type MongoStatus = 'connected' | 'disconnected' | 'connecting';

interface DbStats {
  products: number;
  orders: number;
  categories: number;
  environment: string;
  memoryUsage: string;
  uptime: string;
}

export default function MongoStatus() {
  const [status, setStatus] = useState<MongoStatus>('connecting');
  const [uptime, setUptime] = useState<number>(0);
  const [stats, setStats] = useState<DbStats | null>(null);

  // Fetch MongoDB and system stats
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/admin/db-status', { cache: 'no-store' });
        const data = await res.json();

        if (res.status === 401) {
          setStatus('disconnected');
          setUptime(0);
          setStats(null);
          return;
        }

        const nextStatus: MongoStatus =
          data.status === 'connected' || data.status === 'connecting' || data.status === 'disconnected'
            ? data.status
            : 'disconnected';
        setStatus(nextStatus);
        if (nextStatus === 'connected') {
          setUptime((prev) => prev + 5);
          setStats({
            products: data.products ?? 0,
            orders: data.orders ?? 0,
            categories: data.categories ?? 0,
            environment: data.environment ?? 'unknown',
            memoryUsage: data.memoryUsage ?? 'N/A',
            uptime: data.dbUptime ?? 'N/A',
          });
        } else {
          setUptime(0);
          setStats(null);
        }
      } catch {
        setStatus('disconnected');
        setUptime(0);
        setStats(null);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const colorMap: Record<MongoStatus, string> = {
    connected:
      'bg-green-900 border-green-600 text-green-100 shadow-lg shadow-green-900/40',
    disconnected:
      'bg-red-900 border-red-600 text-red-100 shadow-lg shadow-red-900/40',
    connecting:
      'bg-yellow-900 border-yellow-600 text-yellow-100 shadow-lg shadow-yellow-900/40 animate-pulse',
  };

  const textMap: Record<MongoStatus, string> = {
    connected: '🟢 MongoDB Connected',
    disconnected: '🔴 MongoDB Offline',
    connecting: '🟠 Connecting to MongoDB...',
  };

  const uptimeDisplay =
    uptime > 0
      ? ` • Uptime: ${Math.floor(uptime / 60)}m ${uptime % 60}s`
      : '';

  return (
    <div className="space-y-4 mt-4">
      {/* --- Mongo Connection Banner --- */}
      <div
        className={`rounded-lg border px-4 py-2 text-sm font-medium text-center transition-all duration-500 ${colorMap[status]}`}
      >
        {textMap[status]}
        <span className="opacity-80 text-xs font-light">{uptimeDisplay}</span>
      </div>

      {/* --- System Stats Panel --- */}
      {status === 'connected' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm shadow-inner">
          <div>
            <p className="text-gray-400">🧩 Products</p>
            <p className="font-semibold text-white">{stats.products}</p>
          </div>
          <div>
            <p className="text-gray-400">📦 Orders</p>
            <p className="font-semibold text-white">{stats.orders}</p>
          </div>
          <div>
            <p className="text-gray-400">📁 Categories</p>
            <p className="font-semibold text-white">{stats.categories}</p>
          </div>
          <div>
            <p className="text-gray-400">🧠 Environment</p>
            <p className="font-semibold text-white capitalize">
              {stats.environment}
            </p>
          </div>
          <div>
            <p className="text-gray-400">💾 Memory Usage</p>
            <p className="font-semibold text-white">{stats.memoryUsage}</p>
          </div>
          <div>
            <p className="text-gray-400">⏱ DB Uptime</p>
            <p className="font-semibold text-white">{stats.uptime}</p>
          </div>
        </div>
      )}
    </div>
  );
}
