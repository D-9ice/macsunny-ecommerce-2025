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
        
        {/* Main Icon Button - Custom 3D Star */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-16 h-16 flex items-center justify-center hover:scale-110 transition-transform duration-300 animate-pulse-scale"
          aria-label="Tech-Hub DevConsults Ad"
        >
          <Image 
            src="/star-icon.jpg" 
            alt="Star" 
            width={64} 
            height={64}
            className="drop-shadow-2xl"
            style={{ 
              filter: 'drop-shadow(0 0 10px rgba(100, 200, 255, 0.8)) drop-shadow(0 0 20px rgba(200, 220, 255, 0.6))'
            }}
          />
        </button>
      </div>

      {/* Expanded Ad Card */}
      {isExpanded && (
        <div className="absolute top-0 right-0 w-96 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-2xl border-2 border-blue-400 p-5 animate-fade-in-up">
          {/* Close Button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-800 text-white hover:bg-gray-900 transition flex items-center justify-center"
            aria-label="Close ad"
          >
            <X size={14} />
          </button>

          {/* Ad Content */}
          <div className="text-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-lg flex items-center justify-center p-1">
                <Image 
                  src="/star-icon.jpg" 
                  alt="Star" 
                  width={32} 
                  height={32}
                />
              </div>
              <div>
                <h3 className="font-bold text-sm">Tech-Hub DevConsults</h3>
                <p className="text-xs text-gray-600">Web & App Development</p>
              </div>
            </div>

            <p className="text-sm mb-4 leading-relaxed">
              Need a <span className="font-semibold text-blue-700">high-quality, world-class, professionally designed</span> website and applications for your business? Reach out to Tech-Hub DevConsults at{' '}
              <a href="mailto:techub.devconsults@gmail.com" className="text-blue-600 hover:underline font-semibold">
                techub.devconsults@gmail.com
              </a>
            </p>

            <div className="space-y-2 text-xs mb-4 bg-white rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2">
                <span className="text-green-500">📱</span>
                <span className="font-semibold">WhatsApp/Call:</span>
                <a href="tel:+233596106767" className="text-blue-600 hover:underline">+233 596 106 767</a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">📱</span>
                <span className="font-semibold">Alternative:</span>
                <a href="tel:+233249078976" className="text-blue-600 hover:underline">+233 249 078 976</a>
              </div>
            </div>

            <a
              href="mailto:techub.devconsults@gmail.com"
              className="block w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-center py-2.5 rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
            >
              Contact Us Now →
            </a>

            <p className="text-xs text-gray-500 mt-3 text-center">
              📧 techub.devconsults@gmail.com
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
