import './globals.css';
import './lib/initDB';
import type { Metadata, Viewport } from 'next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ThemeProvider } from './context/ThemeContext';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import ToastContainer from './components/Toast';

export const metadata: Metadata = {
  title: 'MacSunny Electronics — Parts Sourcing',
  description: 'Home of original electronic components and accessories.',
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
    icon: '/favicon.ico',
    apple: '/favicon.ico',
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
