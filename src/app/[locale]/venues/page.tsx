export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import { getVenues, getEvents, getCities, getBadges, buildVenueEventCounts, venueEventCount } from '@/lib/supabase';
import { displayName, photoUrl, localized, cityName } from '@/lib/helpers';
import { createClient } from '@/utils/supabase/server';
import VenuesClient from '@/components/VenuesClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const ogUrl = `/api/og/default?${new URLSearchParams({ title: t('venues'), subtitle: t('venuesPageDescription') })}`;
  return {
    title: t('venues'),
    description: t('venuesPageDescription'),
    openGraph: { images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image' },
    alternates: {
      canonical: `/${locale}/venues`,
      languages: {
        'x-default': '/en/venues',
        en: '/en/venues',
        'zh-Hant': '/zh/venues',
        ja: '/ja/venues',
        ko: '/ko/venues',
        th: '/th/venues',
        id: '/id/venues',
      },
    },
  };
}

export default async function VenuesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ region?: string; city?: string }> }) {
  const { locale } = await params;
  const { region, city } = await searchParams;
  const t = await getTranslations('common');
  const tRegions = await getTranslations('regions');

  const [venues, events, cities, badges] = await Promise.all([getVenues(), getEvents(), getCities(), getBadges()]);

  // Fetch gallery photos for all venues (grouped by venue_id, max 5 per venue)
  const supabase = await createClient();
  const { data: allGalleryPhotos } = await supabase
    .from('venue_photos')
    .select('venue_id, photo_url, sort_order')
    .order('sort_order', { ascending: true });

  const galleryMap: Record<string, string[]> = {};
  for (const row of allGalleryPhotos ?? []) {
    if (!galleryMap[row.venue_id]) galleryMap[row.venue_id] = [];
    if (galleryMap[row.venue_id].length < 5) {
      galleryMap[row.venue_id].push(row.photo_url);
    }
  }

  // Build badge name map (badge_id → localized name)
  const badgeNameMap: Record<string, string> = {};
  for (const b of badges) {
    badgeNameMap[b.id] = localized(b.fields as Record<string, unknown>, 'name', locale) || b.id;
  }

  // Serialize venues
  const cityMap = new Map(cities.map((c) => [c.id, c.fields]));
  const venueCountsFallback = buildVenueEventCounts(events);
  // Only show venues that have at least one event
  const venuesWithEvents = venues.filter((v) => v.fields.event_list && v.fields.event_list.length > 0);
  const sorted = [...venuesWithEvents].sort((a, b) => displayName(a.fields).localeCompare(displayName(b.fields)));

  // Build a set of venue IDs that have a jam session within the next 7 days
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const venuesWithUpcomingJam = new Set<string>();
  for (const e of events) {
    if (e.fields.subtype !== 'jam_session') continue;
    const start = e.fields.start_at;
    if (!start) continue;
    const d = new Date(start);
    if (d >= now && d <= sevenDaysLater) {
      for (const vid of e.fields.venue_id || []) {
        venuesWithUpcomingJam.add(vid);
      }
    }
  }

  const jazzFreqLabel: Record<string, string> = {
    nightly: t('jazzNightly'), weekends: t('jazzWeekends'), occasional: t('jazzOccasional'),
  };

  const serializedVenues = sorted.map((venue) => {
    const f = venue.fields;
    const cityFields = f.city_id?.[0] ? cityMap.get(f.city_id[0]) : null;
    return {
      id: venue.id,
      displayName: displayName(f),
      photoUrl: photoUrl(f.photo_url) || null,
      cityRecordId: f.city_id?.[0] || null,
      cityLabel: cityFields ? cityName(cityFields, locale) : '',
      eventCount: venueEventCount(venue, venueCountsFallback),
      jazzFrequency: f.jazz_frequency || null,
      jazzFrequencyLabel: f.jazz_frequency ? (jazzFreqLabel[f.jazz_frequency] || f.jazz_frequency) : null,
      description: localized(f as Record<string, unknown>, 'description', locale) || null,
      descriptionShort: localized(f as Record<string, unknown>, 'description_short', locale) || null,
      hasUpcomingJam: venuesWithUpcomingJam.has(venue.id),
      jamBadgeLabel: t('jamThisWeek'),
      tier: f.tier || 0,
      badgeList: f.badge_list || [],
      galleryPhotos: galleryMap[venue.id] || [],
    };
  });

  // Build city options with countryCode (only cities that have venues with events)
  const cityIdsInUse = new Set(venuesWithEvents.flatMap((v) => v.fields.city_id || []));
  const cityOptions = cities
    .filter((c) => cityIdsInUse.has(c.id))
    .map((c) => ({
      recordId: c.id,
      citySlug: c.fields.city_id || '',
      label: cityName(c.fields, locale),
      countryCode: c.fields.country_code || '',
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Build region labels from i18n
  const regionCodes = [...new Set(cityOptions.map((c) => c.countryCode).filter(Boolean))];
  const regionLabels: Record<string, string> = {};
  for (const code of regionCodes) {
    try { regionLabels[code] = tRegions(code as 'TW' | 'JP' | 'HK'); } catch { regionLabels[code] = code; }
  }

  // Build initial filters from URL search params
  const initialFilters = (region || city) ? { region, city } : undefined;

  return (
    <VenuesClient
      venues={serializedVenues}
      cities={cityOptions}
      locale={locale}
      regionLabels={regionLabels}
      worldMapLabel={tRegions('worldMap')}
      badgeNameMap={badgeNameMap}
      initialFilters={initialFilters}
      labels={{
        venues: t('venues'),
        allCities: t('allCities'),
        noVenues: t('noVenues'),
      }}
    />
  );
}
