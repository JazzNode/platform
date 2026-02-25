import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileTabBar from '@/components/MobileTabBar';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | JazzNode',
    default: 'JazzNode — The Jazz Scene, Connected.',
  },
  description: 'Discover jazz venues, artists, and events worldwide.',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#0A0A0A',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-[#0A0A0A] text-[#F0EDE6] antialiased noise-overlay`}>
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-8">{children}</main>
          <Footer />
          <MobileTabBar />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
