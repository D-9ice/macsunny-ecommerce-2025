'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="force-bg-green-light rounded-xl p-8 mb-6">
        <div className="w-16 h-16 bg-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 force-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2 force-green-dark">Order Placed Successfully!</h1>
        <p className="mb-4 force-green-medium">Thank you for your order.</p>
        {orderId && (
          <div className="force-bg-white rounded-lg p-4 inline-block">
            <p className="text-sm mb-1 force-gray-medium">Your Order ID</p>
            <p className="text-lg font-mono font-bold force-black">{orderId}</p>
          </div>
        )}
      </div>

      <div className="force-bg-gray-light rounded-xl p-6 mb-6 text-left">
        <h2 className="font-semibold mb-3 force-black">What happens next?</h2>
        <ul className="space-y-2 force-text-dark">
          <li className="flex items-start">
            <span className="mr-2">📞</span>
            <span>We&apos;ll contact you to confirm your order</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">📦</span>
            <span>Your items will be prepared for delivery</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">🚚</span>
            <span>We&apos;ll arrange delivery to your address</span>
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <p className="force-gray-medium">
          Need help? Contact us via WhatsApp or call: <br />
          <a href="tel:+233243380902" className="font-semibold force-green-link">
            (+233) 024 338 0902
          </a>
        </p>
        
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-green-700 force-white rounded-lg hover:bg-green-800 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}