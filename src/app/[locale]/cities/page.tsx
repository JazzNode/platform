export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import { getCities, getVenues, getEvents, getArtists, getTags, buildMap, resolveLinks } from '@/lib/supabase';
import { artistDisplayName, photoUrl, formatDate, cityName, eventTitle } from '@/lib/helpers';
import CitiesClient from '@/components/CitiesClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  return {
    title: t('cities'),
    description: t('citiesPageDescription'),
    alternates: {
      canonical: `/${locale}/cities`,
      languages: {
        'x-default': '/en/cities',
        en: '/en/cities',
        'zh-Hant': '/zh/cities',
        ja: '/ja/cities',
        ko: '/ko/cities',
        th: '/th/cities',
        id: '/id/cities',
      },
    },
  };
}

export default async function CitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const tRegions = await getTranslations('regions');

  const [cities, venues, events, artists, tags] = await Promise.all([
    getCities(), getVenues(), getEvents(), getArtists(), getTags(),
  ]);

  const tagMap = buildMap(tags);

  const now = new Date().toISOString();

  const cityStats = cities.map((city) => {
    // Only count venues that have at least one event
    const cityVenues = venues.filter((v) => v.fields.city_id?.includes(city.id) && v.fields.event_list && v.fields.event_list.length > 0);
    const venueIds = new Set(cityVenues.map((v) => v.id));
    const cityEvents = events.filter((e) => e.fields.venue_id?.some((vid) => venueIds.has(vid)));
    const upcomingEvents = cityEvents.filter((e) => e.fields.start_at && e.fields.start_at >= now);
    const eventIds = new Set(cityEvents.map((e) => e.id));
    const cityArtists = artists.filter((a) => a.fields.event_list?.some((eid) => eventIds.has(eid)));

    // Upcoming event slides (up to 6, exclude jam sessions, pre-serialized for client carousel)
    const upcomingSlides = [...upcomingEvents]
      .filter((e) => {
        const eventTags = resolveLinks(e.fields.tag_list, tagMap).map((t) => t.fields.name?.toLowerCase());
        return !eventTags.includes('jam session');
      })
      .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
      .slice(0, 6)
      .map((e) => ({
        date: formatDate(e.fields.start_at, locale, e.fields.timezone || city.fields.timezone || 'Asia/Taipei'),
        title: eventTitle(e.fields, locale),
        href: `/${locale}/events/${e.id}`,
      }));

    // Weekly jam sessions (next 30 days, tag = 'jam session')
    const thirtyDaysLater = new Date(new Date(now).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const weeklyJams = upcomingEvents
      .filter((e) => {
        if (!e.fields.start_at || e.fields.start_at > thirtyDaysLater) return false;
        const eventTags = resolveLinks(e.fields.tag_list, tagMap).map((t) => t.fields.name?.toLowerCase());
        return eventTags.includes('jam session');
      })
      .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
      .slice(0, 4)
      .map((e) => ({
        date: formatDate(e.fields.start_at, locale, e.fields.timezone || city.fields.timezone || 'Asia/Taipei'),
        title: eventTitle(e.fields, locale),
        href: `/${locale}/events/${e.id}`,
      }));

    // Venue photos (up to 3)
    const venuePhotos = cityVenues
      .map((v) => ({
        url: photoUrl(v.fields.photo_url),
        name: v.fields.display_name || v.fields.name_local || v.fields.name_en || '',
      }))
      .filter((p): p is { url: string; name: string } => p.url !== null)
      .slice(0, 3);

    // Top artists by event frequency in this city
    const topArtists = cityArtists
      .map((a) => ({
        artist: a,
        count: (a.fields.event_list || []).filter((eid) => eventIds.has(eid)).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((af) => af.artist);

    return {
      city,
      venueCount: cityVenues.length,
      upcomingCount: upcomingEvents.length,
      artistCount: cityArtists.length,
      venues: cityVenues,
      upcomingSlides,
      weeklyJams,
      venuePhotos,
      topArtists,
    };
  });

  // Only show cities that have at least one venue
  const activeCityStats = cityStats.filter((s) => s.venueCount > 0);

  // Preserve the order from getCities() (which has international priority)
  const cityOrder = new Map(cities.map((c, i) => [c.id, i]));
  activeCityStats.sort((a, b) => (cityOrder.get(a.city.id) ?? 0) - (cityOrder.get(b.city.id) ?? 0));

  // Build region labels from i18n
  const regionCodes = [...new Set(activeCityStats.map((s) => s.city.fields.country_code).filter(Boolean))];
  const regionLabels: Record<string, string> = {};
  for (const code of regionCodes) {
    try { regionLabels[code!] = tRegions(code as 'TW' | 'JP' | 'HK'); } catch { regionLabels[code!] = code!; }
  }

  // Serialize for client component
  const serializedCities = activeCityStats.map(({ city, venueCount, upcomingCount, artistCount, venues: cityVenues, upcomingSlides, weeklyJams, venuePhotos, topArtists }) => ({
    id: city.id,
    name: cityName(city.fields, locale),
    countryCode: city.fields.country_code || '',
    venueCount,
    upcomingCount,
    artistCount,
    venues: cityVenues.map((v) => ({
      id: v.id,
      displayName: v.fields.display_name || v.fields.name_local || v.fields.name_en || '',
      photoUrl: photoUrl(v.fields.photo_url),
    })),
    venuePhotos,
    topArtists: topArtists.map((a) => ({
      id: a.id,
      displayName: artistDisplayName(a.fields, locale),
    })),
    upcomingSlides,
    weeklyJams,
  }));

  return (
    <CitiesClient
      cities={serializedCities}
      locale={locale}
      regionLabels={regionLabels}
      worldMapLabel={tRegions('worldMap')}
      labels={{
        cities: t('cities'),
        citiesCount: t('citiesCount'),
        venuesInCity: t('venuesInCity'),
        eventsInCity: t('eventsInCity'),
        artistsInCity: t('artistsInCity'),
        topPerformers: t('topPerformers'),
        weeklyJam: t('weeklyJam'),
        nextUpcoming: t('nextUpcoming'),
        exploreCityEvents: t('exploreCityEvents'),
      }}
    />
  );
}
