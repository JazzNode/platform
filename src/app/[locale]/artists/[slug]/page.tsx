import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getArtists, getEvents, getVenues, getBadges, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, photoUrl } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artists = await getArtists();
  const artist = artists.find((a) => a.id === slug);
  return { title: artist ? displayName(artist.fields) : 'Artist' };
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');

  const [artists, events, venues, badges] = await Promise.all([getArtists(), getEvents(), getVenues(), getBadges()]);
  const artist = artists.find((a) => a.id === slug);

  if (!artist) {
    return <p>Artist not found.</p>;
  }

  const f = artist.fields;
  const desc = locale === 'zh' ? f.description_zh : locale === 'ja' ? f.description_ja : f.description_en;
  const artistEvents = resolveLinks(f.event_list, events)
    .sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''));
  const artistBadges = resolveLinks(f.badge_list, badges);

  return (
    <div className="space-y-8">
      <Link href={`/${locale}/artists`} className="text-sm text-muted-foreground hover:text-foreground">
        {t('backToList')}
      </Link>

      <div className="flex flex-col md:flex-row gap-6">
        {photoUrl(f.photo_url, f.photo_file) ? (
          <div className="w-48 h-48 rounded-full overflow-hidden shrink-0">
            <img src={photoUrl(f.photo_url, f.photo_file)!} alt={displayName(f)} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-48 h-48 rounded-full bg-muted flex items-center justify-center text-5xl shrink-0">🎵</div>
        )}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{displayName(f)}</h1>
          {f.name_en && f.name_local && f.name_en !== f.name_local && (
            <p className="text-lg text-muted-foreground">{f.name_en}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {f.primary_instrument && <Badge variant="outline" className="capitalize">🎵 {f.primary_instrument}</Badge>}
            {f.type && <Badge variant="outline">{f.type === 'group' ? '👥 Group' : '👤 Solo'}</Badge>}
            {f.country_code && <Badge variant="outline">🌍 {f.country_code}</Badge>}
            {f.is_master && <Badge>🌟 Master</Badge>}
            {f.verification_status === 'Verified' && <Badge variant="secondary">{t('verified')} ✓</Badge>}
          </div>
          {artistBadges.length > 0 && (
            <div className="flex gap-2">
              {artistBadges.map((b) => (
                <Badge key={b.id} className="text-xs">
                  {locale === 'zh' ? b.fields.name_zh : locale === 'ja' ? b.fields.name_ja : b.fields.name_en}
                </Badge>
              ))}
            </div>
          )}
          {f.genres && f.genres.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {f.genres.map((g) => <Badge key={g} variant="outline" className="text-xs">{g}</Badge>)}
            </div>
          )}
          {desc && <p className="text-muted-foreground leading-relaxed">{desc}</p>}

          <div className="flex gap-3 text-sm">
            {f.website_url && <a href={f.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">🌐 Website</a>}
            {f.spotify_url && <a href={f.spotify_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">🎧 Spotify</a>}
            {f.youtube_url && <a href={f.youtube_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">▶️ YouTube</a>}
            {f.instagram && <a href={`https://instagram.com/${f.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">📸 Instagram</a>}
          </div>
        </div>
      </div>

      <Separator />

      <section>
        <h2 className="text-xl font-semibold mb-4">{t('events')} ({artistEvents.length})</h2>
        {artistEvents.length === 0 ? (
          <p className="text-muted-foreground">{t('noEvents')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {artistEvents.slice(0, 20).map((event) => {
              const tz = event.fields.timezone || 'Asia/Taipei';
              const venue = resolveLinks(event.fields.venue_id, venues)[0];
              return (
                <Card key={event.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="text-xs text-muted-foreground">{formatDate(event.fields.start_at, locale, tz)}</div>
                    <CardTitle className="text-sm">{event.fields.title || event.fields.title_local || event.fields.title_en}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {venue && <p>📍 {displayName(venue.fields)}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
