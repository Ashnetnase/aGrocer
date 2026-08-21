import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AgrocerProvider } from '@/providers/AgrocerProvider';
import { ServiceWorkerRegistrar } from '@/components/layout/ServiceWorkerRegistrar';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Agrocer',
  description: 'Meals, pantry and groceries for the whole family.',
  applicationName: 'Agrocer',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Agrocer',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#F7F3EC',
  width: 'device-width',
  initialScale: 1,
  // Let the app sit under the notch so the frame reaches the screen edges.
  viewportFit: 'cover',
  // Pinch-zoom stays enabled deliberately — blocking it fails WCAG 1.4.4.
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={plusJakarta.variable}>
      <body className="font-sans">
        <AgrocerProvider>{children}</AgrocerProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
