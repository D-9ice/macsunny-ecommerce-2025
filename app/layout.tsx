// app/layout.tsx
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "MacSunny Electronics",
  description:
    "Your local hub for quality electronics — order by WhatsApp, pay locally, fast delivery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "MacSunny Electronics";
  const WHATSAPP_RAW =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+233243380902";
  const WHATSAPP_DIGITS = WHATSAPP_RAW.replace(/\D/g, "");

  return (
    <html lang="en">
      <body className="antialiased bg-white text-slate-800">
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 h-14 flex items-center justify-between">
            <Link href="/" className="font-extrabold tracking-tight">
              {SITE}
            </Link>
            <nav className="hidden sm:flex gap-6 text-sm">
              <Link href="#catalog" className="hover:underline">
                Catalog
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP_DIGITS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                WhatsApp
              </a>
            </nav>
          </div>
        </header>

        {/* Page content */}
        {children}

        {/* Floating WhatsApp button */}
        <a
          href={`https://wa.me/${WHATSAPP_DIGITS}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-5 right-5 grid place-items-center w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
        >
          <svg
            viewBox="0 0 32 32"
            width="22"
            height="22"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M19.11 17.39c-.29-.14-1.7-.84-1.96-.94-.26-.1-.45-.14-.64.14-.19.29-.73.94-.9 1.13-.16.19-.33.22-.61.08-.29-.14-1.21-.44-2.3-1.41-.85-.76-1.43-1.7-1.6-1.99-.17-.29-.02-.45.13-.59.13-.13.29-.33.44-.49.14-.16.19-.26.29-.45.1-.19.05-.35-.02-.49-.07-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49-.17-.01-.35-.01-.54-.01-.19 0-.49.07-.75.35-.26.29-1 1-1 2.43s1.02 2.82 1.16 3.01c.14.19 2 3.05 4.86 4.28.68.29 1.21.46 1.62.59.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33z" />
            <path d="M26.9 5.1C24.2 2.4 20.7 1 17 1 8.7 1 2 7.7 2 16c0 2.6.7 5.1 2.1 7.3L2 31l7-2.1C11.1 29.3 14 30 17 30c8.3 0 15-6.7 15-15 0-3.7-1.4-7.2-4.1-9.9zM17 27.5c-2.6 0-5.1-.8-7.2-2.2l-.5-.3-4.1 1.2 1.2-4.1-.3-.5C4.5 19.4 3.8 17.7 3.8 16 3.8 8.9 9.9 2.8 17 2.8c3.5 0 6.8 1.4 9.3 3.9 2.5 2.5 3.9 5.8 3.9 9.3 0 7.1-5.8 12.8-13.2 12.8z" />
          </svg>
        </a>
      </body>
    </html>
  );
}
