export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import { getArtists } from '@/lib/airtable';
import { displayName, photoUrl, localized } from '@/lib/helpers';
import ArtistsClient from '@/components/ArtistsClient';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('artists') };
}

export default async function ArtistsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const tInst = await getTranslations('instruments');

  const artists = await getArtists();

  // Collect unique instruments (from primary_instrument, lowercased)
  const instrumentSet = new Set<string>();
  for (const a of artists) {
    if (a.fields.primary_instrument) {
      instrumentSet.add(a.fields.primary_instrument.toLowerCase());
    }
  }
  const instruments = [...instrumentSet].sort();

  // Build instrument translation map for client component
  const instrumentNames: Record<string, string> = {};
  for (const inst of instruments) {
    try { instrumentNames[inst] = tInst(inst as never); } catch { instrumentNames[inst] = inst; }
  }

  // Serialize for client component
  const sorted = [...artists].sort((a, b) => displayName(a.fields).localeCompare(displayName(b.fields)));
  const serialized = sorted.map((a) => {
    const f = a.fields;
    return {
      id: a.id,
      displayName: displayName(f),
      type: f.type || null,
      primaryInstrument: f.primary_instrument || null,
      instrumentList: (f.instrument_list || []).map((i) => i.toLowerCase()),
      countryCode: f.country_code || null,
      eventCount: f.event_list?.length || 0,
      bio: localized(f as Record<string, unknown>, 'bio_short', locale) || null,
      photoUrl: photoUrl(f.photo_url, f.photo_file) || null,
    };
  });

  return (
    <ArtistsClient
      artists={serialized}
      instruments={instruments}
      locale={locale}
      instrumentNames={instrumentNames}
      labels={{
        artists: t('artists'),
        allInstruments: t('allInstruments'),
        allTypes: t('allTypes'),
        musicians: t('musicians'),
        groups: t('groups'),
        bigBands: t('bigBands'),
        noArtists: t('noArtists'),
      }}
    />
  );
}
