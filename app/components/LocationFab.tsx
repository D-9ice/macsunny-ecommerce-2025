'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

export default function LocationFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Multi-color Spinning Glow Effect */}
      <div className="fixed bottom-[156px] right-5 w-16 h-16 rounded-full animate-spin-slow z-40">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-green-500 to-yellow-400 opacity-75 blur-md"></div>
      </div>

      {/* Floating Location Button with Google Maps Colors */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-[156px] right-5 bg-white hover:bg-gray-50 text-gray-800 p-4 rounded-full shadow-lg z-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400 w-16 h-16 flex items-center justify-center border-2 border-gray-200"
        aria-label="View Location"
      >
        {open ? (
          <X size={24} className="text-gray-800" />
        ) : (
          <svg viewBox="0 0 48 48" className="w-8 h-8">
            {/* Google Maps Pin Icon */}
            <path fill="#1976D2" d="M24,4c-7.7,0-14,6.3-14,14c0,10.5,14,26,14,26s14-15.5,14-26C38,10.3,31.7,4,24,4z"/>
            <circle fill="#FFF" cx="24" cy="17" r="5"/>
            <path fill="#1976D2" d="M24,11c-3.3,0-6,2.7-6,6s2.7,6,6,6s6-2.7,6-6S27.3,11,24,11z M24,20c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S25.7,20,24,20z"/>
            <path fill="#EA4335" d="M24,44S10,28.5,10,18c0-2.4,0.6-4.6,1.7-6.6"/>
            <path fill="#FBBC04" d="M37.3,11.4C36.4,9.6,35.3,8,34,6.7"/>
            <path fill="#34A853" d="M29.7,5.3C27.9,4.5,25.9,4,24,4"/>
          </svg>
        )}
      </button>

      {/* Animated Pop-up */}
      {open && (
        <div className="fixed bottom-[232px] right-5 z-[60] w-64 rounded-xl force-bg-white p-4 shadow-2xl border-2 border-blue-400 animate-fade-in-up">
          <h3 className="mb-2 font-bold force-black">Find Us</h3>
          <p className="mb-3 text-sm force-gray-dark">
            ZONGOLANE ACCRA CENTRAL, ACCRA, GHANA
          </p>
          <a
            href="https://maps.app.goo.gl/2Nn1h2YZgfJ59n8C8"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md bg-[#1976D2] py-2 text-center font-semibold force-white transition hover:bg-[#1565C0]"
          >
            View on Google Maps
          </a>
        </div>
      )}
    </>
  );
}
