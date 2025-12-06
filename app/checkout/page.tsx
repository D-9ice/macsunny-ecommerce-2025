
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CartItem,
  getCart,
  cartTotal,
  clearCart,
} from '@/app/lib/cart';
import DeliveryLocationPicker from '@/app/components/DeliveryLocationPicker';
import type { Location } from '@/app/lib/geolocation';

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  // Backup form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  // Delivery state
  const [wantsDelivery, setWantsDelivery] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<Location | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);
  
  // Keep customName and customPhone for later review
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    setItems(getCart());
  }, []);

  const total = cartTotal(items);
  const finalTotal = wantsDelivery && deliveryInfo && !deliveryInfo.freeDelivery
    ? total + deliveryInfo.deliveryCost
    : total;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) return;

    try {
      // Create order in database
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          total: finalTotal,
          customerName: form.name,
          customerEmail: form.email || undefined,
          customerPhone: form.phone,
          customerAddress: wantsDelivery && deliveryLocation 
            ? deliveryLocation.address 
            : (form.address || 'Pickup at store'),
          deliveryRequested: wantsDelivery,
          deliveryLocation: wantsDelivery ? deliveryLocation : undefined,
          deliveryInfo: wantsDelivery ? deliveryInfo : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        clearCart();
        router.push(`/success?orderId=${data.order.orderId}`);
      } else {
        alert(`Order failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Order submission error:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  const disabled = items.length === 0;

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>

      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <section className="rounded-lg border p-4 mb-6">
            <h2 className="font-semibold mb-3">Order Summary</h2>
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.sku} className="flex justify-between text-sm">
                  <span>
                    {it.name} × {it.qty}
                  </span>
                  <span>GHS {(it.price * it.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t pt-3 font-bold">
              <span>Subtotal</span>
              <span>GHS {total.toFixed(2)}</span>
            </div>
            {wantsDelivery && deliveryInfo && (
              <>
                <div className="mt-2 flex justify-between text-sm">
                  <span>Delivery Cost</span>
                  {deliveryInfo.freeDelivery ? (
                    <span className="text-green-600 font-semibold">FREE</span>
                  ) : (
                    <span>GHS {deliveryInfo.deliveryCost.toFixed(2)}</span>
                  )}
                </div>
                <div className="mt-2 flex justify-between border-t pt-2 font-bold text-lg">
                  <span>Total</span>
                  <span>GHS {finalTotal.toFixed(2)}</span>
                </div>
              </>
            )}
          </section>

          <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4">
            <div>
              <label className="block text-sm mb-1">Full name</label>
              <input
                className="w-full rounded border px-3 py-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Phone / WhatsApp</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-black">Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-black"
                placeholder="john@example.com"
              />
            </div>

            {/* Delivery Option Toggle */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wantsDelivery}
                    onChange={(e) => setWantsDelivery(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mr-3"
                  />
                  <span className="text-sm font-medium text-black">
                    📦 I want delivery service
                  </span>
                </label>
                {wantsDelivery && deliveryInfo && (
                  <span className="text-xs text-gray-600">
                    Est. {deliveryInfo.estimatedTime}
                  </span>
                )}
              </div>

              {wantsDelivery ? (
                <DeliveryLocationPicker
                  cartTotal={total}
                  onLocationSelected={(location, info) => {
                    setDeliveryLocation(location);
                    setDeliveryInfo(info);
                  }}
                />
              ) : (
                <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-700">
                  <p className="flex items-center gap-2">
                    <span>🏪</span>
                    <span>You will pick up your order at the store</span>
                  </p>
                  <p className="mt-2 text-xs text-gray-600">
                    MacSunny Electronics, Accra, Ghana
                  </p>
                </div>
              )}
            </div>

            {/* Optional Address field (for notes/additional info) */}
            {!wantsDelivery && (
              <div>
                <label className="block text-sm font-medium mb-1 text-black">
                  Additional Notes (optional)
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-black"
                  rows={2}
                  placeholder="Any special instructions..."
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 disabled:bg-gray-400 transition-colors"
              disabled={disabled}
            >
              Place Order
            </button>
            <Link
              href="/cart"
              className="block text-center text-green-700 hover:underline"
            >
              ← Back to Cart
            </Link>
          </form>
        </>
      )}
    </main>
  );
}