import './globals.css';
import type { Metadata } from 'next';
import Navbar from '../components/Navbar';

export const metadata: Metadata = {
  title: 'MacSunny Electronics',
  description: 'Parts sourcing • Components • Accessories',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4">{children}</main>
      </body>
    </html>
  );
}
