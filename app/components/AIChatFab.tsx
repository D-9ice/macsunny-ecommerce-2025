'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

export default function AIChatFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Multi-color Spinning Glow Effect */}
      <div className="fixed bottom-[88px] right-5 w-16 h-16 rounded-full animate-spin-slow z-40">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 opacity-75 blur-md"></div>
      </div>

      {/* Floating AI Chat Button with Bold "Ask macsunny AI" Text */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-[88px] right-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-full shadow-lg z-50 hover:from-blue-700 hover:to-purple-700 transition focus:outline-none focus:ring-2 focus:ring-purple-400 w-16 h-16 flex flex-col items-center justify-center"
        aria-label="Chat with AI"
      >
        {open ? (
          <X size={24} />
        ) : (
          <div className="flex flex-col items-center justify-center leading-none gap-0.5">
            <span className="text-[13px] font-black tracking-tight">Ask</span>
            <span className="text-[11px] font-black tracking-tighter">macsunny</span>
            <span className="text-[13px] font-black tracking-tight">AI</span>
          </div>
        )}
      </button>

      {/* Animated Pop-up */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] w-64 rounded-xl force-bg-white p-4 shadow-2xl border-2 border-purple-400 animate-fade-in-up">
          <h3 className="mb-2 font-bold force-black">Ask MacSunny AI</h3>
          <p className="mb-3 text-sm force-gray-dark">
            Chat with our AI assistant for instant help.
          </p>
          <button
            onClick={() => alert('AI Assistant coming soon! 🤖')}
            className="block w-full rounded-md bg-gradient-to-r from-blue-600 to-purple-600 py-2 text-center font-semibold force-white transition hover:from-blue-700 hover:to-purple-700"
          >
            Start Chat
          </button>
        </div>
      )}
    </>
  );
}
