'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';

export default function AdBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed top-16 right-2 md:top-20 md:right-5 z-40" style={{ perspective: '1000px' }}>
      {/* Floating Treasure Chest */}
      <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
        {/* Glowing Light Rays */}
        <div className="absolute -inset-4 md:-inset-6 animate-light-rays pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-yellow-400/40 via-yellow-300/20 to-transparent blur-2xl"></div>
        </div>
        
        {/* Pulsating Glow Ring */}
        <div className="absolute -inset-3 md:-inset-4 rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 opacity-50 blur-xl animate-spin-slow pointer-events-none"></div>
        
        {/* Treasure Chest Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`relative w-14 h-14 md:w-20 md:h-20 flex items-center justify-center hover:scale-110 transition-all duration-500 cursor-pointer ${!isExpanded ? 'animate-treasure-float' : ''}`}
          aria-label="Frontier DevConsults - Click to open treasure!"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <Image 
            src="/treasure-chest.png" 
            alt="Treasure Chest" 
            width={56} 
            height={56}
            className="md:w-20 md:h-20 drop-shadow-2xl"
            style={{ 
              filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 40px rgba(255, 223, 0, 0.6))',
              transformStyle: 'preserve-3d',
              animation: isExpanded ? 'chest-open 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards' : undefined
            }}
          />
        </button>
      </div>

      {/* Treasure Box Opening - Ad Card Bursts Out! */}
      {isExpanded && (
        <div className="absolute top-0 right-0 w-80 md:w-96 bg-white rounded-xl shadow-2xl border-2 border-blue-300 p-4 md:p-5 origin-top-right"
             style={{
               animation: 'treasure-burst 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
               transformOrigin: 'top right'
             }}>
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition flex items-center justify-center z-10 shadow-md"
            aria-label="Close treasure"
          >
            <X size={16} />
          </button>

          {/* Ad Content */}
          <div>
            {/* Logo at Top Left */}
            <div className="flex items-start mb-2">
              <img 
                src="/frontier-logo.jpg" 
                alt="Frontier DevConsults Logo" 
                width={60} 
                height={60}
                className="object-contain"
              />
            </div>

            {/* Line separator */}
            <div className="border-b border-blue-300 mb-3"></div>

            {/* Invitation Message - HIGHLY VISIBLE */}
            <div className="mb-2">
              <p className="text-sm font-bold leading-snug" style={{ color: '#1e40af' }}>
                Congratulations! You&apos;ve unlocked exclusive access to world-class development services. Get in touch with us for your professional, world-class applications, website, and specialized AI tools or visit our website/app store to request a build.
              </p>
            </div>

            <div className="space-y-1.5 mb-3">
              {/* Website */}
              <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                <span className="text-base">🌐</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mb-0.5" style={{ color: '#000000' }}>Website</p>
                  <a 
                    href="https://www.frontier-devconsults.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-bold hover:underline block truncate"
                    style={{ color: '#1e40af' }}
                  >
                    www.frontier-devconsults.com
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                <span className="text-base">✉️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mb-0.5" style={{ color: '#000000' }}>Email</p>
                  <a 
                    href="mailto:info@frontier-devconsults.com" 
                    className="text-xs font-bold hover:underline block truncate"
                    style={{ color: '#1e40af' }}
                  >
                    info@frontier-devconsults.com
                  </a>
                </div>
              </div>

              {/* Phone 1 */}
              <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                <span className="text-base">📱</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mb-0.5" style={{ color: '#000000' }}>WhatsApp/Call</p>
                  <a 
                    href="tel:+233596106767" 
                    className="text-xs font-bold hover:underline block"
                    style={{ color: '#1e40af' }}
                  >
                    +233 596 106 767
                  </a>
                </div>
              </div>

              {/* Phone 2 */}
              <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                <span className="text-base">📞</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold mb-0.5" style={{ color: '#000000' }}>Alternative</p>
                  <a 
                    href="tel:+233249078976" 
                    className="text-xs font-bold hover:underline block"
                    style={{ color: '#1e40af' }}
                  >
                    +233 249 078 976
                  </a>
                </div>
              </div>
            </div>

            <a
              href="mailto:info@frontier-devconsults.com"
              className="block w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-center py-2 rounded-lg font-bold text-sm hover:from-blue-700 hover:to-indigo-800 transition-all shadow-lg hover:shadow-xl"
            >
              Get Started Now →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
