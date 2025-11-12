import Logo from './Logo';
'use client';
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full bg-green-700 text-white">
      <div id="ms-logo" className="mx-auto max-w-7xl px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-md grid place-items-center text-xs" id="ms-logo"><Logo/></div>
          <div>
            <Link href="/" className="font-bold leading-tight text-3xl sm:text-4xl text-3xl sm:text-4xl font-extrabold"><span className="text-2xl sm:text-3xl font-extrabold tracking-wide">MACSUNNY ELECTRONICS</span></Link>
            <div className="text-[11px] opacity-90">HOME OF HIGH QUALITY ELECTRONICS COMPONENTS & ACCESSORIES—</div>
          </div>
        </div>
        <div className="text-xs sm:text-sm">
          <span className="font-semibold">WhatsApp / Phone:</span> (+233) 0243380902 · 0249135208 · 0551507985<br/>
          <span className="font-semibold">Email:</span> <span className="ml-3 hidden sm:inline"></span> Macsunny2025@gmail.com
        </div>
      </div>
    </header>
  );
}
