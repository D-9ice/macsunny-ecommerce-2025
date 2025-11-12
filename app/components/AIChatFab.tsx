'use client';
import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

export default function AIChatFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Glowing Pulse Ring */}
  <div className="pulse-ring pulse-ring--chat fixed bottom-5 right-24" />

      {/* Floating AI Chat Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-24 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg z-50 hover:from-blue-700 hover:to-purple-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Chat with AI"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {/* Animated Pop-up */}
      {open && (
        <div className="fixed bottom-20 right-24 z-[60] w-64 rounded-xl force-bg-white p-4 shadow-2xl border-2 border-purple-300 animate-fade-in-up">
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
