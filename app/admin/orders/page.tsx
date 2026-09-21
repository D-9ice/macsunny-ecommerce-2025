'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { Order, getAllOrders } from '@/app/lib/orders';
import MongoStatus from '@/app/components/MongoStatus';
import DeliveryTracker from '@/app/components/DeliveryTracker';
import AdminWorkspace from '@/app/admin/components/AdminWorkspace';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState('');

  const loadOrders = useCallback(async (showActivity = false) => {
    if (showActivity) setRefreshing(true);
    try {
      const response = await fetch('/api/orders', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Orders could not be refreshed');
      const nextOrders: Order[] = data.orders || [];
      setOrders(nextOrders);
      setSelectedOrder((current) => current ? nextOrders.find((order) => order.orderId === current.orderId) || null : null);
      setLastRefreshed(new Date());
      setRefreshError('');
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrders(getAllOrders());
      setRefreshError(error instanceof Error ? error.message : 'Orders could not be refreshed');
    } finally {
      if (showActivity) setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadOrders(true); }, [loadOrders]);
  useEffect(() => {
    if (!autoRefresh) return;
    const refresh = () => { if (document.visibilityState === 'visible') void loadOrders(); };
    const interval = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [autoRefresh, loadOrders]);

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        await loadOrders();
        if (selectedOrder?.orderId === orderId) setSelectedOrder({ ...selectedOrder, status: newStatus });
      } else {
        alert(data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status');
    }
  };

  const handleClearCompletedCancelled = async () => {
    const completedCount = orders.filter((order) => order.status === 'completed').length;
    const cancelledCount = orders.filter((order) => order.status === 'cancelled').length;
    const totalCount = completedCount + cancelledCount;
    if (totalCount === 0) {
      alert('No completed or cancelled orders to clear');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete ${totalCount} orders (${completedCount} completed, ${cancelledCount} cancelled)?`)) return;

    try {
      const response = await fetch('/api/orders', { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await loadOrders();
        setSelectedOrder(null);
        alert(`Successfully deleted ${data.deletedCount} orders`);
      } else {
        alert(data.message || 'Failed to delete orders');
      }
    } catch (error) {
      console.error('Failed to delete orders:', error);
      alert('Failed to delete orders');
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-700';
      case 'processing': return 'bg-blue-700';
      case 'completed': return 'bg-green-700';
      case 'cancelled': return 'bg-red-700';
      default: return 'bg-gray-700';
    }
  };

  return (
    <AdminWorkspace title="Orders Management" subtitle="Live order monitoring and fulfilment workspace">
      <div className="sticky -top-4 z-20 -mx-4 mb-4 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur sm:-top-5 sm:-mx-5 sm:px-5 lg:-top-6 lg:-mx-6 lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void loadOrders(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-60"
          >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} size={17} />
            {refreshing ? 'Refreshing…' : 'Refresh now'}
          </button>
          <button
            onClick={() => setAutoRefresh((enabled) => !enabled)}
            aria-pressed={autoRefresh}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${autoRefresh ? 'bg-blue-700 hover:bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            Auto-refresh: {autoRefresh ? 'On' : 'Off'}
          </button>
          <button
            onClick={handleClearCompletedCancelled}
            className="flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold hover:bg-red-600"
          >
            <Trash2 size={17} />
            Clear completed/cancelled
          </button>
          <div className="ml-auto text-xs text-slate-400" aria-live="polite">
            {autoRefresh ? 'Checks every 30 seconds' : 'Auto-refresh paused'}
            {lastRefreshed ? ` · Last ${lastRefreshed.toLocaleTimeString()}` : ''}
          </div>
        </div>
        {refreshError ? <p className="mt-2 text-xs text-red-300">{refreshError}</p> : null}
      </div>

      <div className="mb-4">
        <MongoStatus />
      </div>

      {orders.length === 0 ? (
        <section className="grid min-h-[45vh] place-items-center rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center">
          <div>
            <h2 className="text-2xl font-bold text-amber-100">No Orders Yet</h2>
            <p className="mt-3 text-slate-400">Orders from customers will appear here.</p>
          </div>
        </section>
      ) : (
        <div className="grid min-h-0 gap-4 lg:h-[calc(100dvh-16rem)] lg:grid-cols-[22rem_minmax(0,1fr)]">
          <section className="min-h-0 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-3">
            <div className="space-y-3">
              {orders.map((order) => (
                <button
                  type="button"
                  key={order.orderId}
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full rounded-xl bg-slate-900 p-4 text-left transition hover:bg-slate-800 ${selectedOrder?.orderId === order.orderId ? 'ring-2 ring-violet-500' : ''}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{order.orderId}</p>
                      <p className="truncate text-xs text-slate-400">{order.customerName}</p>
                    </div>
                    <span className={`rounded px-2 py-1 text-xs ${getStatusColor(order.status)}`}>{order.status}</span>
                  </div>
                  <p className="text-sm font-medium">GHS {order.total.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="min-h-0 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950">
            {selectedOrder ? (
              <div className="p-5">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-amber-100">{selectedOrder.orderId}</h2>
                    <p className="mt-1 text-sm text-slate-400">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  </div>
                  <select
                    value={selectedOrder.status}
                    onChange={(event) => handleStatusChange(selectedOrder.orderId, event.target.value as Order['status'])}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="mb-5 rounded-xl bg-slate-900 p-4">
                  <h3 className="mb-3 font-semibold">Customer Information</h3>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><p className="text-slate-500">Name</p><p>{selectedOrder.customerName}</p></div>
                    <div><p className="text-slate-500">Phone</p><p>{selectedOrder.customerPhone}</p></div>
                    <div className="sm:col-span-2"><p className="text-slate-500">Email</p><p>{selectedOrder.customerEmail}</p></div>
                    <div className="sm:col-span-2"><p className="text-slate-500">Address</p><p>{selectedOrder.customerAddress}</p></div>
                  </div>
                </div>

                <div className="mb-5"><DeliveryTracker order={selectedOrder} /></div>

                <div>
                  <h3 className="mb-3 font-semibold">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-4 rounded-xl bg-slate-900 p-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="text-sm text-slate-500">{item.sku}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-medium">GHS {item.price.toFixed(2)} × {item.qty}</p>
                          <p className="text-sm text-slate-500">GHS {(item.price * item.qty).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-emerald-400">GHS {selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid h-full min-h-[45vh] place-items-center p-8 text-center text-slate-400">
                Select an order to view details.
              </div>
            )}
          </section>
        </div>
      )}
    </AdminWorkspace>
  );
}
