export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import { getVenues, getCities } from '@/lib/airtable';
import { displayName, photoUrl, localized } from '@/lib/helpers';
import VenuesClient from '@/components/VenuesClient';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('venues') };
}

export default async function VenuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');

  const [venues, cities] = await Promise.all([getVenues(), getCities()]);

  // Serialize venues
  const cityMap = new Map(cities.map((c) => [c.id, c.fields]));
  const sorted = [...venues].sort((a, b) => (b.fields.event_list?.length || 0) - (a.fields.event_list?.length || 0));

  const serializedVenues = sorted.map((venue) => {
    const f = venue.fields;
    const cityFields = f.city_id?.[0] ? cityMap.get(f.city_id[0]) : null;
    return {
      id: venue.id,
      displayName: displayName(f),
      photoUrl: photoUrl(f.photo_url, f.photo_file) || null,
      cityRecordId: f.city_id?.[0] || null,
      cityLabel: cityFields
        ? (locale === 'en' ? cityFields.name_en || cityFields.name_local || '' : cityFields.name_local || cityFields.name_en || '')
        : '',
      eventCount: f.event_list?.length || 0,
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
      label: locale === 'en' ? (c.fields.name_en || c.fields.name_local || '') : (c.fields.name_local || c.fields.name_en || ''),
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
