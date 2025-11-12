'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CartItem, getCart, setQty, removeFromCart, cartTotal } from '@/app/lib/cart';

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCart());
  }, []);

  const handleQuantityChange = (sku: string, newQty: number) => {
    const updatedCart = setQty(sku, newQty);
    setItems(updatedCart);
  };

  const handleRemove = (sku: string) => {
    const updatedCart = removeFromCart(sku);
    setItems(updatedCart);
  };

  const total = cartTotal(items);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-white">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-12 text-center">
          <div className="mb-4 text-6xl">🛒</div>
          <h2 className="mb-2 text-xl font-semibold text-white">Your cart is empty</h2>
          <p className="mb-6 text-gray-400">Add some products to get started!</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-4">
            {items.map((item) => (
              <div
                key={item.sku}
                className="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-900 p-4 sm:flex-row sm:items-center"
              >
                {/* Product Image */}
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-black/60">
                  <img
                    src={item.image || '/macsunny-logo.png'}
                    alt={item.name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.src = '/macsunny-logo.png';
                    }}
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1">
                  <h3 className="mb-1 text-lg font-semibold text-white">{item.name}</h3>
                  <p className="text-sm text-gray-400">SKU: {item.sku}</p>
                  <p className="mt-2 text-lg font-medium text-yellow-400">
                    GHS {item.price.toFixed(2)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(item.sku, item.qty - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-600 bg-gray-800 text-white transition-colors hover:bg-gray-700"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-lg font-semibold text-white">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.sku, item.qty + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-600 bg-gray-800 text-white transition-colors hover:bg-gray-700"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Item Total */}
                <div className="text-right">
                  <p className="text-sm text-gray-400">Total</p>
                  <p className="text-xl font-bold text-green-400">
                    GHS {(item.price * item.qty).toFixed(2)}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(item.sku)}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  aria-label={`Remove ${item.name}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between border-b border-gray-700 pb-4">
              <span className="text-lg font-semibold text-white">Subtotal</span>
              <span className="text-lg text-gray-300">GHS {total.toFixed(2)}</span>
            </div>
            <div className="mb-4 flex items-center justify-between border-b border-gray-700 pb-4">
              <span className="text-lg font-semibold text-white">Tax (0%)</span>
              <span className="text-lg text-gray-300">GHS 0.00</span>
            </div>
            <div className="mb-6 flex items-center justify-between">
              <span className="text-2xl font-bold text-white">Total</span>
              <span className="text-2xl font-bold text-green-400">
                GHS {total.toFixed(2)}
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-gray-700"
              >
                Continue Shopping
              </Link>
              <button
                onClick={() => router.push('/checkout')}
                className="flex-1 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
