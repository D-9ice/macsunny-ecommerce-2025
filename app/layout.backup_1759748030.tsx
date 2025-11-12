// app/layout.tsx
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "MacSunny Electronics — Parts Sourcing",
  description: "Home of original electronic components",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-black text-gray-100">
        {/* HEADER */}
        <header className="bg-green-700 text-white py-3 px-4 flex items-center justify-between flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-white text-green-700 font-bold px-3 py-1 rounded">Logo</div>
            <div>
              <h1 className="text-lg font-bold">MACSUNNY ELECTRONICS</h1>
              <p className="text-sm">home of original components — <Link href="https://macsunny.com" className="underline">macsunny.com</Link></p>
            </div>
          </div>

          <div className="text-sm leading-tight text-right">
            <p><b>WhatsApp / Phone:</b> (+233) 0243380902 • 0249135208 • 0551507985</p>
            <p><b>Email:</b> Macsunny2025@gmail.com</p>
          </div>
        </header>

        <main className="flex-grow">{children}</main>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-gray-300 text-sm px-4 py-6 mt-6">
          <div className="text-center mb-3">
            <p>
              <strong>MacSunny Electronics</strong> — Parts Sourcing • WhatsApp/Phone:
              (+233) 0243380902 / 0249135208 / 0551507985 • Email: Macsunny2025@gmail.com
            </p>
          </div>

          <div className="text-center mb-2">
            <p>
              Designed and created for <b>MacSunny Electronics</b> by
              <b> Totally Tech-Hub Developers</b>.
            </p>
            <p>
              Email: <b>totallytechhub@gmail.com</b> • Phone:
              (+233)0596106767 / (+233)024978976 / (+233)0244809627
            </p>
            <p>All rights reserved © {new Date().getFullYear()}</p>
          </div>

          {/* PAYMENTS */}
          <div className="flex justify-center gap-6 mt-4 flex-wrap">
            <span className="bg-yellow-400 text-black px-3 py-1 rounded-md">MTN MoMo</span>
            <span className="bg-red-500 px-3 py-1 rounded-md">AirtelTigo Cash</span>
            <span className="bg-blue-600 px-3 py-1 rounded-md">Telecel</span>
            <span className="bg-gray-200 text-black px-3 py-1 rounded-md">Visa / MasterCard</span>
          </div>

          {/* PLACEHOLDERS */}
          <div className="mt-4 text-center space-y-1">
            <p className="text-xs italic text-gray-400">[AI Integration Placeholder]</p>
            <p className="text-xs italic text-gray-400">[Geolocation & Delivery Tracking Placeholder]</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
