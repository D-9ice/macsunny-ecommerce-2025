'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let toastCounter = 0;
const listeners = new Set<(toasts: ToastMessage[]) => void>();
let toasts: ToastMessage[] = [];

export function showToast(message: string, type: ToastType = 'info') {
  const id = `toast-${++toastCounter}`;
  const newToast = { id, message, type };
  toasts = [...toasts, newToast];
  listeners.forEach((listener) => listener(toasts));

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    removeToast(id);
  }, 3000);
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  listeners.forEach((listener) => listener(toasts));
}

export default function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    listeners.add(setMessages);
    return () => {
      listeners.delete(setMessages);
    };
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {messages.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg
            animate-[slideIn_0.3s_ease-out] min-w-[300px] max-w-md
            ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 text-white'
            }
          `}
        >
          {toast.type === 'success' && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="h-5 w-5 flex-shrink-0" />}
          {toast.type === 'info' && <Info className="h-5 w-5 flex-shrink-0" />}
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 rounded p-1 transition-colors hover:bg-white/20"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
