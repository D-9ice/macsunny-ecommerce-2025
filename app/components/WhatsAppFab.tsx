'use client';
import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

export default function WhatsAppFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Animated Color-Shifting Pulse Ring */}
      <div className="pulse-ring pulse-ring--whatsapp fixed bottom-5 right-5" />

      {/* Floating WhatsApp Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg z-50 transition focus:outline-none focus:ring-2 focus:ring-green-400"
        aria-label="Chat on WhatsApp"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Animated Pop-up */}
      {open && (
        <div className="fixed bottom-20 right-5 z-[60] w-64 rounded-xl force-bg-white p-4 shadow-2xl border-2 border-gray-300 animate-fade-in-up">
          <h3 className="mb-2 font-bold force-black">Chat with us on WhatsApp</h3>
          <p className="mb-3 text-sm force-gray-dark">We'll reply as soon as possible.</p>
          <a
            href="https://wa.me/233243380902?text=Hello%20MacSunny%20Electronics!"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md bg-green-600 py-2 text-center font-semibold force-white transition hover:bg-green-700"
          >
            Open Chat
          </a>
        </div>
      )}
    </>
  );
}
