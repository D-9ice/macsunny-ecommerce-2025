// Paystack payment utilities using @paystack/inline-js

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export interface PaystackConfig {
  key: string;
  email: string;
  amount: number; // in kobo (GHS * 100)
  ref: string;
  currency?: string;
  metadata?: {
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
  onSuccess?: (transaction: any) => void;
  onClose?: () => void;
}

export function initializePaystack(config: PaystackConfig) {
  if (typeof window === 'undefined' || !window.PaystackPop) {
    console.error('Paystack not loaded');
    return null;
  }

  const handler = window.PaystackPop.setup(config);
  return handler;
}

export function generatePaymentReference(prefix: string = 'PAY'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function formatAmountToKobo(amount: number): number {
  return Math.round(amount * 100);
}

export function formatAmountFromKobo(amountInKobo: number): number {
  return amountInKobo / 100;
}

export function getPaystackPublicKey(): string {
  return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
}
