export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import { getVenues, getEvents, getCities, buildVenueEventCounts, venueEventCount } from '@/lib/airtable';
import { displayName, photoUrl, localized, cityName } from '@/lib/helpers';
import VenuesClient from '@/components/VenuesClient';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('venues') };
}

export default async function VenuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');

  const [venues, events, cities] = await Promise.all([getVenues(), getEvents(), getCities()]);

  // Serialize venues
  const cityMap = new Map(cities.map((c) => [c.id, c.fields]));
  const venueCountsFallback = buildVenueEventCounts(events);
  const sorted = [...venues].sort((a, b) => venueEventCount(b, venueCountsFallback) - venueEventCount(a, venueCountsFallback));

  const serializedVenues = sorted.map((venue) => {
    const f = venue.fields;
    const cityFields = f.city_id?.[0] ? cityMap.get(f.city_id[0]) : null;
    return {
      id: venue.id,
      displayName: displayName(f),
      photoUrl: photoUrl(f.photo_url, f.photo_file) || null,
      cityRecordId: f.city_id?.[0] || null,
      cityLabel: cityFields ? cityName(cityFields, locale) : '',
      eventCount: venueEventCount(venue, venueCountsFallback),
      jazzFrequency: f.jazz_frequency || null,
      description: localized(f as Record<string, unknown>, 'description', locale) || null,
    };
  });

  // Build city options (only cities that have venues)
  const cityIdsInUse = new Set(venues.flatMap((v) => v.fields.city_id || []));
  const cityOptions = cities
    .filter((c) => cityIdsInUse.has(c.id))
    .map((c) => ({
      recordId: c.id,
      label: cityName(c.fields, locale),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <VenuesClient
      venues={serializedVenues}
      cities={cityOptions}
      locale={locale}
      labels={{
        venues: t('venues'),
        allCities: t('allCities'),
        noVenues: t('noVenues'),
      }}
    />
  );
}
