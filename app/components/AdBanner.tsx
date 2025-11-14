'use client';
import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';

export default function AdBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Auto-expand intermittently (every 45 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsExpanded(true);
      // Auto-collapse after 8 seconds
      setTimeout(() => {
        setIsExpanded(false);
      }, 8000);
    }, 45000);

    // Show expanded on first load after 3 seconds
    const initialTimeout = setTimeout(() => {
      setIsExpanded(true);
      setTimeout(() => {
        setIsExpanded(false);
      }, 8000);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-32 right-5 z-50">
      {/* Floating Icon */}
      <div className="relative">
        {/* Animated Glow Ring */}
        <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 opacity-75 blur-lg animate-spin-slow"></div>
        
        {/* Main Icon Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform duration-300"
          aria-label="Tech-Hub DevConsults Ad"
        >
          <Star className="w-7 h-7 fill-white animate-pulse-scale" />
        </button>
      </div>

      {/* Expanded Ad Card */}
      {isExpanded && (
        <div className="absolute top-0 right-0 w-80 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow-2xl border-2 border-yellow-400 p-5 animate-fade-in-up">
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
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center text-white">
                <Star size={20} className="fill-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Tech-Hub DevConsults</h3>
                <p className="text-xs text-gray-600">Web & App Development</p>
              </div>
            </div>

            <p className="text-sm mb-4 leading-relaxed">
              Need a <span className="font-semibold text-yellow-600">professional website</span> or{' '}
              <span className="font-semibold text-amber-600">mobile app</span> for your business?
              We build world-class solutions!
            </p>

            <div className="space-y-2 text-xs mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                <span>E-commerce & Business Websites</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Mobile Apps (iOS & Android)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                <span>Custom Software Solutions</span>
              </div>
            </div>

            <a
              href="mailto:techub.devconsults@gmail.com"
              className="block w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-center py-2.5 rounded-lg font-semibold text-sm hover:from-yellow-500 hover:to-amber-600 transition-all shadow-md hover:shadow-lg"
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
