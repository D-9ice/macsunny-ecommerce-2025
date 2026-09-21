'use client';

import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-emerald-800/60 bg-[#020b08] py-10 text-gray-200">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 text-center">
        <section aria-labelledby="footer-contact-title">
          <h2 id="footer-contact-title" className="text-sm font-bold uppercase tracking-[.18em] text-emerald-300">MacSunny Electronics</h2>
          <p className="mt-3 text-sm text-gray-300">Parts Sourcing • WhatsApp/Phone: (+233) 0243380902 / 0249135208 / 0551507985</p>
          <a href="mailto:Macsunny2025@gmail.com" className="mt-1 inline-block text-sm text-emerald-200 underline">Macsunny2025@gmail.com</a>
        </section>

        <section aria-labelledby="payment-methods-title">
          <h2 id="payment-methods-title" className="text-sm font-bold uppercase tracking-[.18em] text-amber-300">Accepted payment methods</h2>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
          <a 
            href="https://www.mtn.com.gh/personal/momo/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex h-12 w-48 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 font-semibold text-black transition-all hover:scale-105 hover:shadow-lg"
          >
            <Image src="/payments/mtn.svg" alt="" width={55} height={25} /> MTN MoMo
          </a>
          <a 
            href="https://www.airteltigo.com.gh/airteltigo-money" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex h-12 w-48 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
          >
            <Image src="/payments/airteltigo.svg" alt="" width={74} height={27} /> AirtelTigo Cash
          </a>
          <a 
            href="https://telecelghana.com/personal/mobile-financial-services/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex h-12 w-48 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
          >
            <Image src="/payments/telecel.svg" alt="" width={62} height={27} /> Telecel Cash
          </a>
          </div>
        </section>

        <section className="border-t border-emerald-900/70 pt-6" aria-labelledby="developer-credit-title">
          <h2 id="developer-credit-title" className="text-xs font-bold uppercase tracking-[.18em] text-amber-300">Developer credit</h2>
          <p className="mt-3 text-sm leading-6 text-gray-300">
            Designed and developed for <strong className="text-white">MacSunny Electronics</strong> by <strong className="text-white">Frontier DevConsults</strong>.<br />
            <a href="https://www.frontier-devconsults.com" target="_blank" rel="noopener noreferrer" className="underline">www.frontier-devconsults.com</a> • <a href="mailto:info@frontier-devconsults.com" className="underline">info@frontier-devconsults.com</a><br />
            (+233) 0596106767 / 0249078976 / 0244809627
          </p>
          <p className="mt-4 text-xs text-gray-500">All rights reserved © 2026 MacSunny Electronics.</p>
        </section>
      </div>
    </footer>
  );
}
