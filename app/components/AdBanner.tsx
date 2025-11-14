'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

export default function AdBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-5 z-50">
      {/* Floating Icon */}
      <div className="relative">
        {/* Animated Glow Ring */}
        <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 opacity-60 blur-lg animate-spin-slow"></div>
        
        {/* Main Icon Button - 3D Silver Star */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-16 h-16 flex items-center justify-center hover:scale-110 transition-transform duration-300 animate-pulse-scale"
          aria-label="Tech-Hub DevConsults Ad"
        >
          <span className="text-6xl drop-shadow-2xl" style={{ 
            filter: 'drop-shadow(0 0 10px rgba(192, 192, 192, 0.8)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.6))'
          }}>
            ⭐
          </span>
        </button>
      </div>

      {/* Expanded Ad Card */}
      {isExpanded && (
        <div className="absolute top-0 right-0 w-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-2xl border-2 border-gray-400 p-5 animate-fade-in-up">
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
              <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center text-white">
                <span className="text-2xl">⭐</span>
              </div>
              <div>
                <h3 className="font-bold text-sm">Tech-Hub DevConsults</h3>
                <p className="text-xs text-gray-600">Web & App Development</p>
              </div>
            </div>

            <p className="text-sm mb-4 leading-relaxed">
              Need a <span className="font-semibold text-gray-700">professional website</span> or{' '}
              <span className="font-semibold text-gray-800">mobile app</span> for your business?
              We build world-class solutions!
            </p>

            <div className="space-y-2 text-xs mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                <span>E-commerce & Business Websites</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                <span>Mobile Apps (iOS & Android)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                <span>Custom Software Solutions</span>
              </div>
            </div>

            <a
              href="mailto:techub.devconsults@gmail.com"
              className="block w-full bg-gradient-to-r from-gray-600 to-gray-800 text-white text-center py-2.5 rounded-lg font-semibold text-sm hover:from-gray-700 hover:to-gray-900 transition-all shadow-md hover:shadow-lg"
            >
              Get Started →
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
