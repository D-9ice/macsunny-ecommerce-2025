'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Order, getAllOrders, updateOrderStatus } from '@/app/lib/orders';
import MongoStatus from '@/app/components/MongoStatus';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrders(getAllOrders());
    }
  };

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
        if (selectedOrder?.orderId === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      } else {
        alert(data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status');
    }
  };

  const handleClearCompletedCancelled = async () => {
    const completedCount = orders.filter(o => o.status === 'completed').length;
    const cancelledCount = orders.filter(o => o.status === 'cancelled').length;
    const totalCount = completedCount + cancelledCount;

    if (totalCount === 0) {
      alert('No completed or cancelled orders to clear');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete ${totalCount} orders (${completedCount} completed, ${cancelledCount} cancelled)?`)) {
      return;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'DELETE',
      });

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
   <main className="min-h-screen bg-black text-white p-6">
  <div className="max-w-7xl mx-auto">
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold">Orders Management</h1>
      <div className="flex gap-3">
        <button
          onClick={handleClearCompletedCancelled}
          className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg transition-colors flex items-center gap-2"
          title="Delete all completed and cancelled orders"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Completed/Cancelled
        </button>
        <Link
          href="/admin/dashboard"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>

    {/* ✅ MongoDB Connection Status */}
    <div className="mb-6">
      <MongoStatus />
    </div>

        {orders.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">No Orders Yet</h2>
            <p className="text-gray-400">Orders from customers will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Orders List */}
            <div className="lg:col-span-1 space-y-3">
              {orders.map((order) => (
                <div
                  key={order.orderId}
                  onClick={() => setSelectedOrder(order)}
                  className={`bg-gray-900 rounded-lg p-4 cursor-pointer transition-all hover:bg-gray-800 ${
                    selectedOrder?.orderId === order.orderId ? 'ring-2 ring-green-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{order.orderId}</p>
                      <p className="text-xs text-gray-400">{order.customerName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium">GHS {order.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>

            {/* Order Details */}
            <div className="lg:col-span-2">
              {selectedOrder ? (
                <div className="bg-gray-900 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{selectedOrder.orderId}</h2>
                      <p className="text-gray-400">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    </div>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => handleStatusChange(selectedOrder.orderId, e.target.value as Order['status'])}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Customer Info */}
                  <div className="mb-6 bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Customer Information</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400">Name</p>
                        <p>{selectedOrder.customerName}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Phone</p>
                        <p>{selectedOrder.customerPhone}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-400">Email</p>
                        <p>{selectedOrder.customerEmail}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-400">Address</p>
                        <p>{selectedOrder.customerAddress}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold mb-3">Order Items</h3>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-800 rounded-lg p-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-400">{item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">GHS {item.price.toFixed(2)} × {item.qty}</p>
                            <p className="text-sm text-gray-400">GHS {(item.price * item.qty).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-2xl font-bold text-green-500">GHS {selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-400">
                  Select an order to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
