'use client';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-800/40 bg-black py-10 text-gray-200">
      <div className="mx-auto max-w-6xl px-4 text-center space-y-5">
        <p>
          <span className="font-semibold">MacSunny Electronics</span> — Parts Sourcing • WhatsApp/Phone:
          (+233) 0243380902 / 0249135208 / 0551507985 • Email: Macsunny2025@gmail.com
        </p>

        {/* Placeholders restored */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            disabled
            className="rounded-full border border-dashed border-gray-500/70 px-4 py-1 text-sm opacity-80"
            title="Coming soon"
          >
            🤖 AI Assistant (coming soon)
          </button>
          <button
            disabled
            className="rounded-full border border-dashed border-gray-500/70 px-4 py-1 text-sm opacity-80"
            title="Coming soon"
          >
            📍 Geolocation & Delivery (coming soon)
          </button>
        </div>

        <p>
          Designed and created for <span className="font-semibold">MacSunny Electronics</span> by
          <span className="font-semibold"> Tech-Hub DevConsults</span>. Email:{' '}
          <a href="mailto:totallytechhub@gmail.com" className="underline">techub.devconsults@gmail.com</a> • Phone:
          (+233)0596106767 / (+233)0249078976 / (+233)0244809627
        </p>

        <p className="text-xs opacity-70">All rights reserved © 2025.</p>

        {/* Payment badges */}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <a 
            href="https://www.mtn.com.gh/personal/momo/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="rounded-full bg-yellow-400 px-4 py-1 font-semibold text-black transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
          >
            MTN MoMo
          </a>
          <a 
            href="https://www.airteltigo.com.gh/airteltigo-money" 
            target="_blank" 
            rel="noopener noreferrer"
            className="rounded-full bg-blue-600 px-4 py-1 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
          >
            AirtelTigo Cash
          </a>
          <a 
            href="https://telecelghana.com/personal/mobile-financial-services/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="rounded-full bg-red-600 px-4 py-1 font-semibold text-white transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
          >
            Telecel
          </a>
          <a 
            href="https://paystack.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="rounded-full bg-white px-4 py-1 font-semibold text-gray-900 transition-all hover:scale-105 hover:shadow-lg cursor-pointer border-2 border-gray-300"
          >
            Visa / MasterCard
          </a>
        </div>
      </div>
    </footer>
  );
}
