'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';

export default function AdBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-5 z-50">
      {/* Floating Icon */}
      <div className="relative">
        {/* Animated Glow Ring */}
        <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-blue-300 via-cyan-400 to-blue-300 opacity-60 blur-lg animate-spin-slow"></div>
        
        {/* Main Icon Button - Diamond with Spin & Pulse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-16 h-16 flex items-center justify-center hover:scale-110 transition-transform duration-300"
          aria-label="Tech-Hub DevConsults Ad"
        >
          <Image 
            src="/diamond-icon.png" 
            alt="Diamond" 
            width={64} 
            height={64}
            className="drop-shadow-2xl animate-spin-pulse"
            style={{ 
              filter: 'drop-shadow(0 0 10px rgba(100, 200, 255, 0.8)) drop-shadow(0 0 20px rgba(200, 220, 255, 0.6))'
            }}
          />
        </button>
      </div>

      {/* Expanded Ad Card */}
      {isExpanded && (
        <div className="absolute top-0 right-0 w-96 bg-white rounded-xl shadow-2xl border-2 border-blue-400 p-6 animate-fade-in-up">
          {/* Close Button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-800 text-white hover:bg-gray-900 transition flex items-center justify-center"
            aria-label="Close ad"
          >
            <X size={16} />
          </button>

          {/* Ad Content */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center p-2">
                <Image 
                  src="/diamond-icon.png" 
                  alt="Diamond" 
                  width={32} 
                  height={32}
                  className="animate-spin-slow"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg text-blue-600">Tech-Hub DevConsults</h3>
                <p className="text-sm text-gray-600">Web & App Development</p>
              </div>
            </div>

            <p className="text-base font-bold leading-relaxed mb-5" style={{ color: '#2563EB' }}>
              Need a high-quality, world-class, professionally designed website and applications for your business? Reach out to Tech-Hub DevConsults at{' '}
              <a href="mailto:techub.devconsults@gmail.com" className="underline" style={{ color: '#1D4ED8' }}>
                techub.devconsults@gmail.com
              </a>
            </p>

            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg">
                <span className="text-2xl">📱</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 font-semibold mb-1">WhatsApp/Call</p>
                  <a href="tel:+233596106767" className="text-base font-bold text-blue-600 hover:underline block">
                    +233 596 106 767
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg">
                <span className="text-2xl">📱</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 font-semibold mb-1">Alternative</p>
                  <a href="tel:+233249078976" className="text-base font-bold text-blue-600 hover:underline block">
                    +233 249 078 976
                  </a>
                </div>
              </div>
            </div>

            <a
              href="mailto:techub.devconsults@gmail.com"
              className="block w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-center py-3 rounded-lg font-bold text-base hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
            >
              Contact Us Now →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
