import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getArtists } from '@/lib/airtable';
import { displayName, photoUrl } from '@/lib/helpers';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('artists') };
}

export default async function ArtistsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const artists = await getArtists();

  // Group by primary instrument
  const byInstrument = new Map<string, typeof artists>();
  for (const a of artists) {
    const inst = a.fields.primary_instrument || 'Other';
    if (!byInstrument.has(inst)) byInstrument.set(inst, []);
    byInstrument.get(inst)!.push(a);
  }

  const instruments = [...byInstrument.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">{t('artists')}</h1>
        <p className="text-muted-foreground mt-1">{artists.length} artists</p>
      </div>

      {instruments.map(([instrument, instArtists]) => (
        <section key={instrument}>
          <h2 className="text-xl font-semibold mb-4 capitalize">{instrument}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {instArtists.map((artist) => (
              <Link key={artist.id} href={`/${locale}/artists/${artist.id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  {photoUrl(artist.fields.photo_url, artist.fields.photo_file) ? (
                    <div className="h-36 overflow-hidden rounded-t-lg">
                      <img
                        src={photoUrl(artist.fields.photo_url, artist.fields.photo_file)!}
                        alt={displayName(artist.fields)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-36 rounded-t-lg bg-muted flex items-center justify-center text-3xl">
                      🎵
                    </div>
                  )}
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{displayName(artist.fields)}</CardTitle>
                    <div className="flex gap-1 flex-wrap">
                      {artist.fields.is_master && <Badge className="text-xs">🌟 Master</Badge>}
                      {artist.fields.verification_status === 'Verified' && (
                        <Badge variant="secondary" className="text-xs">{t('verified')} ✓</Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
