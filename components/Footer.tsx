'use client';

export default function Footer() {
  return (
    <footer
      id="site-footer"
      data-footer-version="2026-09-21-visible-static-payments"
      className="scroll-mt-24 border-t-4 border-amber-400 bg-[#020b08] py-10 text-gray-200 shadow-[0_-18px_60px_rgba(0,0,0,.7)]"
      style={{ position: 'relative', zIndex: 120, isolation: 'isolate', opacity: 1, visibility: 'visible', backgroundColor: '#020b08' }}
    >
      <div
        className="mx-auto grid max-w-6xl gap-8 px-4 text-center"
        style={{ position: 'relative', zIndex: 1, opacity: 1, visibility: 'visible' }}
      >
        <section aria-labelledby="footer-contact-title">
          <h2 id="footer-contact-title" className="text-sm font-bold uppercase tracking-[.18em] text-emerald-300">
            MacSunny Electronics
          </h2>
          <p className="mt-3 text-sm text-gray-300">
            Parts Sourcing • WhatsApp/Phone: (+233) 0243380902 / 0249135208 / 0551507985
          </p>
          <a href="mailto:Macsunny2025@gmail.com" className="mt-1 inline-block text-sm text-emerald-200 underline">
            Macsunny2025@gmail.com
          </a>
        </section>

        <section aria-label="Payment labels">
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <span className="inline-flex h-12 w-48 cursor-default items-center justify-center rounded-xl bg-yellow-400 px-4 font-semibold text-black">
              MTN MoMo
            </span>
            <span className="inline-flex h-12 w-48 cursor-default items-center justify-center rounded-xl bg-blue-600 px-4 font-semibold text-white">
              AirtelTigo Cash
            </span>
            <span className="inline-flex h-12 w-48 cursor-default items-center justify-center rounded-xl bg-red-600 px-4 font-semibold text-white">
              Telecel Cash
            </span>
          </div>
        </section>

        <section className="border-t border-emerald-900/70 pt-6" aria-labelledby="developer-credit-title">
          <h2 id="developer-credit-title" className="text-xs font-bold uppercase tracking-[.18em] text-amber-300">
            Developer credit
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-300">
            Designed and developed for <strong className="text-white">MacSunny Electronics</strong> by{' '}
            <strong className="text-white">Frontier DevConsults</strong>.<br />
            <a
              href="https://www.frontier-devconsults.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              www.frontier-devconsults.com
            </a>{' '}
            • <a href="mailto:info@frontier-devconsults.com" className="underline">info@frontier-devconsults.com</a><br />
            (+233) 0596106767 / 0249078976
          </p>
          <p className="mt-4 text-xs text-gray-500">All rights reserved © 2026 MacSunny Electronics.</p>
        </section>
      </div>
    </footer>
  );
}
