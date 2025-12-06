import './globals.css';
import './lib/initDB';
import type { Metadata, Viewport } from 'next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ThemeProvider } from './context/ThemeContext';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import ToastContainer from './components/Toast';
import VisitTracker from './components/VisitTracker';

export const metadata: Metadata = {
  title: 'MacSunny Electronics — Quality Electronic Components & Accessories',
  description: 'MacSunny Electronics - Your trusted source for original electronic components, modules, semiconductors, and accessories in Ghana. Quality parts sourcing for all your electronics needs.',
  keywords: ['electronic components', 'Ghana electronics', 'resistors', 'capacitors', 'ICs', 'modules', 'semiconductors', 'MacSunny'],
  authors: [{ name: 'MacSunny Electronics' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MacSunny Electronics',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'MacSunny Electronics — Quality Electronic Components',
    description: 'Your trusted source for original electronic components and accessories in Ghana',
    url: 'https://www.macsunny.com',
    siteName: 'MacSunny Electronics',
    images: ['/macsunny-logo.png'],
    locale: 'en_GH',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f5132',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MacSunny" />
      </head>
      <body className="transition-colors duration-300">
        <ReactQueryProvider>
          <ThemeProvider>
            <VisitTracker />
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
            <Footer />
            <ToastContainer />
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
