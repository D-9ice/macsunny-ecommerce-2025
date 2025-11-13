'use client';
import { useState } from 'react';
import { MapPin, X } from 'lucide-react';

export default function LocationFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Glowing Pulse Ring */}
      <div className="pulse-ring pulse-ring--location fixed bottom-5 right-44" />

      {/* Floating Location Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-44 bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-full shadow-lg z-50 transition focus:outline-none focus:ring-2 focus:ring-amber-300"
        aria-label="View Location"
      >
        {open ? <X size={22} /> : <MapPin size={22} />}
      </button>

      {/* Animated Pop-up */}
      {open && (
        <div className="fixed bottom-20 right-44 z-[60] w-64 rounded-xl force-bg-white p-4 shadow-2xl border-2 border-amber-300 animate-fade-in-up">
          <h3 className="mb-2 font-bold force-black">Find Us</h3>
          <p className="mb-3 text-sm force-gray-dark">
            ZONGOLANE ACCRA CENTRAL, ACCRA, GHANA
          </p>
          <a
            href="https://maps.app.goo.gl/2Nn1h2YZgfJ59n8C8"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md bg-amber-500 py-2 text-center font-semibold force-white transition hover:bg-amber-600"
          >
            View on Map
          </a>
        </div>
      )}
    </>
  );
}
