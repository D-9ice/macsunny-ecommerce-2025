'use client';
import { useState, useEffect } from 'react';
import { X, Code2, Sparkles } from 'lucide-react';

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
    <div className="fixed top-5 right-5 z-50">
      {/* Floating Icon */}
      <div className="relative">
        {/* Animated Glow Ring */}
        <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 opacity-75 blur-lg animate-spin-slow"></div>
        
        {/* Main Icon Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-14 h-14 bg-gradient-to-br from-orange-500 to-pink-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform duration-300"
          aria-label="Tech-Hub DevConsults Ad"
        >
          <Code2 className="w-7 h-7" />
          <Sparkles className="w-3 h-3 absolute top-1 right-1 animate-pulse" />
        </button>
      </div>

      {/* Expanded Ad Card */}
      {isExpanded && (
        <div className="absolute top-0 right-0 w-80 bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl shadow-2xl border-2 border-orange-300 p-5 animate-fade-in-up">
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
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center text-white">
                <Code2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Tech-Hub DevConsults</h3>
                <p className="text-xs text-gray-600">Web & App Development</p>
              </div>
            </div>

            <p className="text-sm mb-4 leading-relaxed">
              Need a <span className="font-semibold text-orange-600">professional website</span> or{' '}
              <span className="font-semibold text-pink-600">mobile app</span> for your business?
              We build world-class solutions!
            </p>

            <div className="space-y-2 text-xs mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                <span>E-commerce & Business Websites</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                <span>Mobile Apps (iOS & Android)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                <span>Custom Software Solutions</span>
              </div>
            </div>

            <a
              href="mailto:techub.devconsults@gmail.com"
              className="block w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white text-center py-2.5 rounded-lg font-semibold text-sm hover:from-orange-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
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
