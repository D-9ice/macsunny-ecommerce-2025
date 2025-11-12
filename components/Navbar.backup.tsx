'use client';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="bg-green-800 text-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        {/* left: logo + title + tagline */}
        <div className="flex items-center gap-3">
          {/* octagon logo placeholder with hover spin */}
          <div
            className="grid place-items-center text-xs bg-white text-green-800 font-bold"
            style={{
              width: 56,
              height: 56,
              clipPath:
                'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
              transition: 'transform .6s ease-in-out',
              border: '2px solid #166534', // dark-green stroke to read well
              borderRadius: 8                 // smooth corners for the container
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = 'rotate(360deg)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = 'none')}
          >
            Logo
          </div>

          <div className="leading-tight">
            <div className="text-3xl sm:text-4xl font-extrabold tracking-wide">
              MACSUNNY ELECTRONICS
            </div>
            <div className="text-sm sm:text-base opacity-90">
              HOME OF HIGH QUALITY ELECTRONICS COMPONENTS & ACCESSORIES
              <span className="md:hidden">
                {' '}— <Link href="https://macsunny.com" className="underline">macsunny.com</Link>
              </span>
            </div>
          </div>
        </div>

        {/* right: contact + domain (md+) */}
        <div className="text-right text-sm">
          <div>
            <span className="font-semibold">WhatsApp / Phone:</span> (+233) 0243380902 · 0249135208 · 0551507985
          </div>
          <div>
            <span className="font-semibold">Email:</span> Macsunny2025@gmail.com
            <span className="ml-2 hidden md:inline">
              • <Link href="https://macsunny.com" className="underline">macsunny.com</Link>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
