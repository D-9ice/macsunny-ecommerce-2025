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
          aria-label="Tech-Hub DevConsults Ad - Click to open treasure!"
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
        <div className="absolute top-0 right-0 w-80 md:w-96 bg-gradient-to-br from-yellow-50 via-white to-amber-50 rounded-xl shadow-2xl border-4 border-yellow-400 p-4 md:p-6 origin-top-right"
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
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gray-800 text-white hover:bg-gray-900 transition flex items-center justify-center z-10"
            aria-label="Close treasure"
          >
            <X size={16} />
          </button>

          {/* Ad Content */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl flex items-center justify-center p-2 shadow-lg">
                <Image 
                  src="/treasure-chest.png" 
                  alt="Treasure" 
                  width={40} 
                  height={40}
                  className="animate-pulse"
                />
              </div>
              <div>
                <h3 className="font-bold text-xl bg-gradient-to-r from-yellow-600 to-amber-700 bg-clip-text text-transparent">
                  Tech-Hub DevConsults
                </h3>
                <p className="text-sm font-semibold text-amber-700">Unlock World-Class Solutions</p>
              </div>
            </div>

            <p className="text-base font-bold leading-relaxed mb-5" style={{ color: '#B45309' }}>
              Need a high-quality, world-class, professionally designed website and applications for your business? Reach out to Tech-Hub DevConsults at{' '}
              <a href="mailto:techub.devconsults@gmail.com" className="underline hover:text-amber-800" style={{ color: '#92400E' }}>
                techub.devconsults@gmail.com
              </a>
            </p>

            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-100 to-amber-100 p-3 rounded-lg border border-yellow-300">
                <span className="text-2xl">📱</span>
                <div className="flex-1">
                  <p className="text-xs text-amber-700 font-semibold mb-1">WhatsApp/Call</p>
                  <a href="tel:+233596106767" className="text-base font-bold hover:underline block" style={{ color: '#92400E' }}>
                    +233 596 106 767
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-100 to-amber-100 p-3 rounded-lg border border-yellow-300">
                <span className="text-2xl">📱</span>
                <div className="flex-1">
                  <p className="text-xs text-amber-700 font-semibold mb-1">Alternative</p>
                  <a href="tel:+233249078976" className="text-base font-bold hover:underline block" style={{ color: '#92400E' }}>
                    +233 249 078 976
                  </a>
                </div>
              </div>
            </div>

            <a
              href="mailto:techub.devconsults@gmail.com"
              className="block w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-white text-center py-3 rounded-lg font-bold text-base hover:from-yellow-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl"
            >
              Unlock Your Treasure Now →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
