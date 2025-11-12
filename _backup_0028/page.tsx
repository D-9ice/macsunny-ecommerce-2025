'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CartItem,
  getCart,
  cartTotal,
  clearCart,
} from '../app/lib/cart';

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    setItems(getCart());
  }, []);

  const total = cartTotal(items);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // here you could POST to your API for real orders
    clearCart();
    router.push('/checkout/success');
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
              <span>Total</span>
              <span>GHS {total.toFixed(2)}</span>
            </div>
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
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded border px-3 py-2"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Delivery address</label>
              <textarea
                className="w-full rounded border px-3 py-2"
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              disabled={disabled}
              className="rounded bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              Place Order
            </button>
          </form>
        </>
      )}
    </main>
  );
}
