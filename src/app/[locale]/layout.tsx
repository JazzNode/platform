import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileTabBar from '@/components/MobileTabBar';
import ThemeProvider from '@/components/ThemeProvider';
import SearchProvider from '@/components/SearchProvider';
import dynamic from 'next/dynamic';
const SearchOverlay = dynamic(() => import('@/components/SearchOverlay'));
import IntroOverlay from '@/components/animations/IntroOverlay';
import { getEvents, getArtists, getVenues, getCities, resolveLinks, buildMap } from '@/lib/airtable';
import { displayName, artistDisplayName, localized, cityName } from '@/lib/helpers';
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

  // Fetch all data for search (cached per request via React.cache)
  const [events, artists, venues, cities] = await Promise.all([
    getEvents(), getArtists(), getVenues(), getCities(),
  ]);

  const now = new Date().toISOString();
  const venueMap = buildMap(venues);
  const artistMap = buildMap(artists);
  const cityMap = buildMap(cities);

  const searchData = {
    events: events
      .filter((e) => e.fields.start_at && e.fields.start_at >= now)
      .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
      .map((e) => {
        const tz = e.fields.timezone || 'Asia/Taipei';
        const venue = resolveLinks(e.fields.venue_id, venueMap)[0];
        const artist = resolveLinks(e.fields.primary_artist, artistMap)[0];
        const d = e.fields.start_at ? new Date(e.fields.start_at) : null;
        return {
          id: e.id,
          title: e.fields.title || e.fields.title_local || e.fields.title_en || 'Event',
          start_at: e.fields.start_at || null,
          venue_name: venue ? displayName(venue.fields) : '',
          primary_artist_name: artist ? artistDisplayName(artist.fields, locale) : null,
          description_short: localized(e.fields as Record<string, unknown>, 'description_short', locale) || null,
          date_display: d ? d.toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', timeZone: tz }) : '',
          time_display: d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }) : '',
        };
      }),
    artists: artists.map((a) => ({
      id: a.id,
      displayName: artistDisplayName(a.fields, locale),
      type: a.fields.type || null,
      primaryInstrument: a.fields.primary_instrument || null,
      countryCode: a.fields.country_code || null,
      bio: localized(a.fields as Record<string, unknown>, 'bio_short', locale) || null,
      photoUrl: a.fields.photo_url || null,
    })),
    venues: venues.map((v) => {
      const city = resolveLinks(v.fields.city_id, cityMap)[0];
      return {
        id: v.id,
        displayName: displayName(v.fields),
        cityName: city ? cityName(city.fields, locale) : '',
        address: v.fields.address_local || v.fields.address_en || null,
        jazz_frequency: v.fields.jazz_frequency || null,
      };
    }),
    cities: cities
      .filter((c) => venues.some((v) => v.fields.city_id?.includes(c.id)))
      .map((c) => ({
        id: c.id,
        citySlug: c.fields.city_id || '',
        name: cityName(c.fields, locale),
        venueCount: venues.filter((v) => v.fields.city_id?.includes(c.id)).length,
      })),
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased noise-overlay`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <SearchProvider data={searchData}>
              <Header />
              <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-8">{children}</main>
              <Footer />
              <MobileTabBar />
              <SearchOverlay />
              <IntroOverlay locale={locale} />
            </SearchProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
