'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VisitCounter from '@/app/components/VisitCounter';
import AdminWorkspace from '@/app/admin/components/AdminWorkspace';

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-auth');
        const data = await response.json();
        if (!data.authenticated) router.push('/admin/login');
        else setIsLoading(false);
      } catch {
        router.push('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[110] grid h-[100dvh] place-items-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-violet-400" />
          <p className="mt-4 text-slate-400">Loading admin workspace…</p>
        </div>
      </div>
    );
  }

  const actions = (
    <>
      <Link href="/admin/password" className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 sm:text-sm">
        Change Password
      </Link>
      <button onClick={handleLogout} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold hover:bg-red-800 sm:text-sm">
        Logout
      </button>
    </>
  );

  return (
    <AdminWorkspace title="Admin Dashboard" subtitle="MacSunny management control centre" actions={actions}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="text-lg font-bold text-amber-100">Inventory</h2>
          <p className="mt-2 text-sm text-slate-400">Manage the complete product catalogue.</p>
          <Link href="/admin/inventory" className="mt-5 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500">
            Open Super Smart Manager
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="text-lg font-bold text-amber-100">Orders</h2>
          <p className="mt-2 text-sm text-slate-400">View, refresh, and manage customer orders.</p>
          <Link href="/admin/orders" className="mt-5 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500">
            View Orders
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="text-lg font-bold text-amber-100">Delivery Settings</h2>
          <p className="mt-2 text-sm text-slate-400">Manage delivery zones, distance, and pricing.</p>
          <Link href="/admin/delivery-settings" className="mt-5 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500">
            Configure Delivery
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="text-lg font-bold text-amber-100">System Settings</h2>
          <p className="mt-2 text-sm text-slate-400">Theme, appearance, system tools, and status.</p>
          <Link href="/admin/settings" className="mt-5 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500">
            Open Settings
          </Link>
        </section>
      </div>

      <div className="mt-5">
        <VisitCounter />
      </div>
    </AdminWorkspace>
  );
}
