import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getActiveRegionCodes } from '@/lib/supabase';
import MobileTabBar from '@/components/MobileTabBar';
import ThemeProvider from '@/components/ThemeProvider';
import SearchProvider from '@/components/SearchProvider';
import AdminProvider from '@/components/AdminProvider';
import AdminLoginModal from '@/components/AdminLoginModal';
import AdminBadge from '@/components/AdminBadge';
import AuthProvider from '@/components/AuthProvider';
import RegionProvider from '@/components/RegionProvider';
import FollowsProvider from '@/components/FollowsProvider';
import ClaimsProvider from '@/components/ClaimsProvider';
import TierConfigProvider from '@/components/TierConfigProvider';
import AuthModal from '@/components/AuthModal';
import OnboardingModal from '@/components/OnboardingModal';
import ClaimGuideModal from '@/components/ClaimGuideModal';
import FollowGuideModal from '@/components/FollowGuideModal';
import ComingSoonToast from '@/components/ComingSoonToast';
import CatEasterEgg from '@/components/CatEasterEgg';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import dynamic from 'next/dynamic';
const SearchOverlay = dynamic(() => import('@/components/SearchOverlay'));
import IntroOverlay from '@/components/animations/IntroOverlay';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s | JazzNode',
    default: 'JazzNode — The Jazz Scene, Connected.',
  },
  description: 'Discover jazz venues, artists, and events worldwide.',
  alternates: {
    languages: {
      'x-default': '/en',
      en: '/en',
      'zh-Hant': '/zh',
      ja: '/ja',
      ko: '/ko',
      th: '/th',
      id: '/id',
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
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
  const [messages, activeRegions] = await Promise.all([
    getMessages(),
    getActiveRegionCodes(),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased noise-overlay`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <SearchProvider locale={locale}>
              <AuthProvider>
              <RegionProvider availableRegions={activeRegions}>
              <FollowsProvider>
              <ClaimsProvider>
              <AdminProvider>
              <TierConfigProvider>
                  <Header />
                  <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-8">{children}</main>
                  <Footer />
                  <MobileTabBar />
                  <SearchOverlay />
                  <IntroOverlay locale={locale} />
                  <AdminLoginModal />
                  <AdminBadge />
                  <AuthModal />
                  <OnboardingModal />
                  <ClaimGuideModal />
                  <FollowGuideModal />
                  <ComingSoonToast />
                  <CatEasterEgg />
                  <ServiceWorkerRegister />
                  <PWAInstallBanner />
              </TierConfigProvider>
              </AdminProvider>
              </ClaimsProvider>
              </FollowsProvider>
              </RegionProvider>
              </AuthProvider>
            </SearchProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
