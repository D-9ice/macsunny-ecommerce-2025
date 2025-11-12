'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication on client side
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-auth');
        const data = await response.json();
        
        if (!data.authenticated) {
          router.push('/admin/login');
        } else {
          setIsLoading(false);
        }
      } catch (error) {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-3">
            <Link
              href="/admin/password"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Change Password
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2">Inventory</h3>
            <p className="text-gray-400 mb-4">Manage your product catalog</p>
            <Link
              href="/admin/inventory"
              className="inline-block px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg transition-colors"
            >
              Manage Inventory
            </Link>
          </div>

          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2">Orders</h3>
            <p className="text-gray-400 mb-4">View and manage orders</p>
            <Link
              href="/admin/orders"
              className="inline-block px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg transition-colors"
            >
              View Orders
            </Link>
          </div>

          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2">Settings</h3>
            <p className="text-gray-400 mb-4">Configure your store</p>
            <Link
              href="/admin/settings"
              className="inline-block px-4 py-2 bg-green-700 hover:bg-green-800 rounded-lg transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/" className="text-green-600 hover:text-green-500">
            ← Back to Store
          </Link>
        </div>
      </div>
    </main>
  );
}