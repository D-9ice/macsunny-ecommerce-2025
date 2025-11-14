'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

export default function AIChatFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Multi-color Spinning Glow Effect */}
      <div className="fixed bottom-5 right-24 w-16 h-16 rounded-full animate-spin-slow z-40">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-500 to-blue-500 opacity-75 blur-md"></div>
      </div>

      {/* Floating AI Chat Button with "Ask AI" Text */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-24 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-full shadow-lg z-50 hover:from-blue-700 hover:to-purple-700 transition focus:outline-none focus:ring-2 focus:ring-purple-400 w-16 h-16 flex flex-col items-center justify-center"
        aria-label="Chat with AI"
      >
        {open ? (
          <X size={24} />
        ) : (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="text-[10px] font-bold mb-0.5">Ask</span>
            <svg viewBox="0 0 24 24" className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
            </svg>
            <span className="text-[10px] font-bold">AI</span>
          </div>
        )}
      </button>

      {/* Animated Pop-up */}
      {open && (
        <div className="fixed bottom-24 right-24 z-[60] w-64 rounded-xl force-bg-white p-4 shadow-2xl border-2 border-purple-400 animate-fade-in-up">
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
