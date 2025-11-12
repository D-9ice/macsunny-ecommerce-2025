// app/checkout/payment/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { 
  initializePaystack, 
  generatePaymentReference, 
  formatAmountToKobo,
  getPaystackPublicKey 
} from '@/app/lib/paystack';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);

  const orderId = searchParams.get('orderId');
  const amount = parseFloat(searchParams.get('amount') || '0');
  const email = searchParams.get('email') || '';
  const name = searchParams.get('name') || '';

  useEffect(() => {
    if (!orderId || !amount) {
      router.push('/checkout');
    }
  }, [orderId, amount, router]);

  const handlePayment = () => {
    if (!paystackLoaded) {
      alert('Payment system is loading. Please wait...');
      return;
    }

    setProcessing(true);
    const reference = generatePaymentReference('MACSUNNY');
    const publicKey = getPaystackPublicKey();

    if (!publicKey) {
      alert('Payment configuration error. Please contact support.');
      setProcessing(false);
      return;
    }

    const handler = initializePaystack({
      key: publicKey,
      email: email || 'customer@macsunny.com',
      amount: formatAmountToKobo(amount),
      ref: reference,
      currency: 'GHS',
      metadata: {
        custom_fields: [
          {
            display_name: 'Order ID',
            variable_name: 'order_id',
            value: orderId || '',
          },
          {
            display_name: 'Customer Name',
            variable_name: 'customer_name',
            value: name,
          },
        ],
      },
      onSuccess: async (transaction: any) => {
        setProcessing(false);
        // Update order with payment reference
        try {
          await fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              paymentRef: transaction.reference,
              paymentStatus: 'success',
              status: 'processing',
            }),
          });
        } catch (error) {
          console.error('Failed to update order:', error);
        }
        router.push(`/success?orderId=${orderId}&paymentRef=${transaction.reference}`);
      },
      onClose: () => {
        setProcessing(false);
        alert('Payment cancelled. You can try again.');
      },
    });

    if (handler) {
      handler.openIframe();
    }
  };

  return (
    <>
      <Script
        src="https://js.paystack.co/v1/inline.js"
        onLoad={() => setPaystackLoaded(true)}
        strategy="lazyOnload"
      />
      
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-white shadow-lg">
          <h1 className="mb-6 text-3xl font-bold">Payment</h1>

          <div className="mb-8 space-y-3">
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Order ID:</span>
              <span className="font-mono font-semibold">{orderId}</span>
            </div>
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Customer:</span>
              <span className="font-semibold">{name}</span>
            </div>
            {email && (
              <div className="flex justify-between border-b border-gray-700 pb-2">
                <span className="text-gray-400">Email:</span>
                <span>{email}</span>
              </div>
            )}
            <div className="flex justify-between pt-4 text-2xl font-bold">
              <span>Total Amount:</span>
              <span className="text-green-400">GHS {amount.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={processing || !paystackLoaded}
            className="w-full rounded-lg bg-green-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : paystackLoaded ? 'Pay with Paystack' : 'Loading Payment...'}
          </button>

          <p className="mt-4 text-center text-sm text-gray-400">
            Secure payment powered by Paystack
          </p>

          <button
            onClick={() => router.back()}
            className="mt-6 w-full rounded-lg border border-gray-600 px-6 py-3 text-white transition-colors hover:bg-gray-800"
          >
            Go Back
          </button>
        </div>
      </main>
    </>
  );
}

export default function PaymentPage() {
  return (
    <Suspense 
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-white shadow-lg">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-500" />
              <p className="mt-4 text-gray-400">Loading payment details...</p>
            </div>
          </div>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
