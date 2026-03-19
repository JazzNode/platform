export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import { getArtists, getCities, getVenues, getBadges } from '@/lib/supabase';
import { artistDisplayName, photoUrl, localized, normalizeInstrumentKey, cityName, displayName } from '@/lib/helpers';
import ArtistsClient from '@/components/ArtistsClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  return {
    title: t('artists'),
    description: t('artistsPageDescription'),
    alternates: {
      canonical: `/${locale}/artists`,
      languages: {
        'x-default': '/en/artists',
        en: '/en/artists',
        'zh-Hant': '/zh/artists',
        ja: '/ja/artists',
        ko: '/ko/artists',
        th: '/th/artists',
        id: '/id/artists',
      },
    },
  };
}

export default async function ArtistsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ instrument?: string; type?: string; region?: string; city?: string; venue?: string }> }) {
  const { locale } = await params;
  const { instrument, type, region, city, venue } = await searchParams;
  const t = await getTranslations('common');
  const tInst = await getTranslations('instruments');
  const tRegions = await getTranslations('regions');

  const [artists, cities, venues, badges] = await Promise.all([
    getArtists(), getCities(), getVenues(), getBadges(),
  ]);

  // Build badge name map (badge_id → localized name)
  const badgeNameMap: Record<string, string> = {};
  for (const b of badges) {
    badgeNameMap[b.id] = localized(b.fields as Record<string, unknown>, 'name', locale) || b.id;
  }

  // Collect unique instruments with counts (from primary_instrument, lowercased)
  const instrumentCount = new Map<string, number>();
  for (const a of artists) {
    if (a.fields.primary_instrument) {
      const inst = a.fields.primary_instrument.toLowerCase();
      instrumentCount.set(inst, (instrumentCount.get(inst) || 0) + 1);
    }
  }
  // Sort by count descending, then alphabetically for ties
  const instruments = [...instrumentCount.keys()].sort((a, b) =>
    (instrumentCount.get(b)! - instrumentCount.get(a)!) || a.localeCompare(b)
  );

  // Build instrument translation map for client component
  const instrumentNames: Record<string, string> = {};
  for (const inst of instruments) {
    try { instrumentNames[inst] = tInst(inst as never); } catch { instrumentNames[inst] = inst; }
  }

  // ── City & Venue footprint data ──
  const cityArtistCount = new Map<string, number>();
  const venueArtistCount = new Map<string, number>();
  for (const a of artists) {
    for (const cid of a.fields.city_list || []) {
      cityArtistCount.set(cid, (cityArtistCount.get(cid) || 0) + 1);
    }
    for (const vid of a.fields.venue_list || []) {
      venueArtistCount.set(vid, (venueArtistCount.get(vid) || 0) + 1);
    }
  }

  const cityOptions = cities
    .filter((c) => cityArtistCount.has(c.id))
    .map((c) => ({
      recordId: c.id,
      label: cityName(c.fields, locale),
      artistCount: cityArtistCount.get(c.id) || 0,
      countryCode: c.fields.country_code || 'ZZ',
    }))
    // Group by country code alphabetically (matching events world map), then by artist count within country
    .sort((a, b) =>
      a.countryCode.localeCompare(b.countryCode)
      || b.artistCount - a.artistCount
    );

  // Build region labels from i18n (same pattern as events page)
  const regionCodes = [...new Set(cityOptions.map((c) => c.countryCode).filter((c) => c !== 'ZZ'))];
  const regionLabels: Record<string, string> = {};
  for (const code of regionCodes) {
    try { regionLabels[code] = tRegions(code as 'TW' | 'JP' | 'HK'); } catch { regionLabels[code] = code; }
  }

  // Build city record-id → name/country lookup for venue labels & sorting
  const cityNameMap = new Map<string, string>();
  const cityCountryMap = new Map<string, string>();
  for (const c of cities) {
    cityNameMap.set(c.id, cityName(c.fields, locale));
    cityCountryMap.set(c.id, c.fields.country_code || 'ZZ');
  }

  const venueOptions = venues
    .filter((v) => venueArtistCount.has(v.id))
    .map((v) => {
      const cids = v.fields.city_id || [];
      return {
        recordId: v.id,
        label: displayName(v.fields),
        artistCount: venueArtistCount.get(v.id) || 0,
        cityRecordIds: cids,
        cityLabel: cids.map((cid) => cityNameMap.get(cid)).filter(Boolean).join(', ') || '',
        _country: cids[0] ? (cityCountryMap.get(cids[0]) || 'ZZ') : 'ZZ',
        _city: cids[0] ? (cityNameMap.get(cids[0]) || '') : '',
      };
    })
    // Group by country → city, then sort by artistCount within each group
    .sort((a, b) =>
      a._country.localeCompare(b._country)
      || a._city.localeCompare(b._city)
      || b.artistCount - a.artistCount
    );

  // Serialize for client component
  const sorted = [...artists].sort((a, b) => artistDisplayName(a.fields, locale).localeCompare(artistDisplayName(b.fields, locale)));
  const serialized = sorted.map((a) => {
    const f = a.fields;
    return {
      id: a.id,
      displayName: artistDisplayName(f, locale),
      type: f.type || null,
      primaryInstrument: f.primary_instrument || null,
      instrumentList: (f.instrument_list || []).map((i) => normalizeInstrumentKey(i)),
      countryCode: f.country_code || null,
      eventCount: f.event_list?.length || 0,
      bio: localized(f as Record<string, unknown>, 'bio_short', locale) || null,
      photoUrl: photoUrl(f.photo_url) || null,
      cityList: f.city_list || [],
      venueList: f.venue_list || [],
      tier: f.tier || 0,
      badgeList: f.badge_list || [],
    };
  });

  // Build initial filters from URL search params
  const initialFilters = (instrument || type || region || city || venue)
    ? { instrument, type, region, city, venue }
    : undefined;

  return (
    <ArtistsClient
      artists={serialized}
      instruments={instruments}
      locale={locale}
      instrumentNames={instrumentNames}
      cityOptions={cityOptions}
      venueOptions={venueOptions}
      regionLabels={regionLabels}
      worldMapLabel={tRegions('worldMap')}
      badgeNameMap={badgeNameMap}
      initialFilters={initialFilters}
      labels={{
        artists: t('artists'),
        allInstruments: t('allInstruments'),
        allTypes: t('allTypes'),
        musicians: t('musicians'),
        groups: t('groups'),
        bigBands: t('bigBands'),
        claimed: t('claimed'),
        noArtists: t('noArtists'),
        artistFootprint: t('artistFootprint'),
        allVenues: t('allVenues'),
      }}
    />
  );
}
