'use client';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="bg-green-800 text-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between flex-col gap-4 md:flex-row md: md: gap-4">
        {/* left: logo + title + tagline */}
        <div className="flex items-center gap-3">
<img src="/macsunny-logo.png" alt="MacSunny Logo" className="w-20 h-20 lg:w-36 lg:h-36 lg:w-32 lg:h-32 animate-spin-horizontal" />
          <div className="leading-tight">
            <div className="text-3xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-wide">
              MACSUNNY ELECTRONICS
            </div>
            <div className="text-sm opacity-95 sm:text-base opacity-90">
              HOME OF HIGH QUALITY ELECTRONICS COMPONENTS & ACCESSORIES
              <span className="md:hidden">
                {' '}— <Link href="https://www.macsunny.com" className="underline">www.macsunny.com</Link>
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
              • <Link href="https://www.macsunny.com" className="underline">www.macsunny.com</Link>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
