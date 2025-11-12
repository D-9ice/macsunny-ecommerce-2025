'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="relative bg-green-800 text-white">
      <div className="flex w-full items-center gap-[2px] sm:gap-[2px] overflow-hidden pl-[3px] pr-[2px] pb-12 pt-4">
        <img
          src="/macsunny-logo.png"
          alt="MacSunny Electronics logo"
          className="h-12 w-12 sm:h-16 sm:w-16 animate-spin-horizontal md:h-20 md:w-20 lg:h-24 lg:w-24 flex-shrink-0"
        />

        <div className="flex-1 min-w-0 pr-[2px] text-center overflow-hidden">
          <p className="whitespace-nowrap font-serif font-extrabold leading-none tracking-normal sm:tracking-wide text-[clamp(9px,6vw,82px)] px-0 sm:px-1">
            MACSUNNY ELECTRONICS
          </p>
          <p className="mt-[1px] whitespace-nowrap text-[clamp(4px,2vw,18px)] uppercase leading-none tracking-wide text-white/90">
            Home of high quality electronics components & accessories
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[1px]">
        <p className="mx-auto max-w-6xl px-[1px] text-center text-[clamp(5px,1.8vw,16px)] text-white/90 whitespace-nowrap overflow-hidden">
          <span className="font-semibold">WhatsApp/Phone:</span> (+233) 0243380902·0249135208·0551507985·<span className="font-semibold">Email:</span> Macsunny2025@gmail.com·<Link href="https://www.macsunny.com" className="underline">www.macsunny.com</Link>
        </p>
      </div>
    </header>
  );
}