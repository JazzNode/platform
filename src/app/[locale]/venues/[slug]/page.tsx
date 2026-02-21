import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getVenues, getEvents, getArtists, getBadges, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, formatTime, photoUrl } from '@/lib/helpers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venues = await getVenues();
  const venue = venues.find((v) => v.id === slug);
  return { title: venue ? displayName(venue.fields) : 'Venue' };
}

export default async function VenueDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');

  const [venues, events, artists, badges] = await Promise.all([getVenues(), getEvents(), getArtists(), getBadges()]);
  const venue = venues.find((v) => v.id === slug);

  if (!venue) {
    return <p>Venue not found.</p>;
  }

  const f = venue.fields;
  const desc = locale === 'zh' ? f.description_zh : locale === 'ja' ? f.description_ja : f.description_en;
  const venueEvents = resolveLinks(f.event_list, events)
    .sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''));
  const venueBadges = resolveLinks(f.badge_list, badges);

  return (
    <div className="space-y-8">
      <Link href={`/${locale}/venues`} className="text-sm text-muted-foreground hover:text-foreground">
        {t('backToList')}
      </Link>

      {/* Hero */}
      <div className="flex flex-col md:flex-row gap-6">
        {photoUrl(f.photo_url, f.photo_file) && (
          <div className="w-full md:w-80 h-52 rounded-lg overflow-hidden shrink-0">
            <img src={photoUrl(f.photo_url, f.photo_file)!} alt={displayName(f)} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">{displayName(f)}</h1>
          {f.name_en && f.name_local && f.name_en !== f.name_local && (
            <p className="text-lg text-muted-foreground">{f.name_en}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {f.city && <Badge variant="outline">{f.city}</Badge>}
            {f.jazz_frequency && <Badge variant="outline">🎵 {f.jazz_frequency}</Badge>}
            {f.capacity && <Badge variant="outline">👥 {f.capacity}</Badge>}
            {f.verification_status === 'Verified' && <Badge variant="secondary">{t('verified')} ✓</Badge>}
          </div>
          {venueBadges.length > 0 && (
            <div className="flex gap-2">
              {venueBadges.map((b) => (
                <Badge key={b.id} className="text-xs">
                  {locale === 'zh' ? b.fields.name_zh : locale === 'ja' ? b.fields.name_ja : b.fields.name_en}
                </Badge>
              ))}
            </div>
          )}
          {desc && <p className="text-muted-foreground leading-relaxed">{desc}</p>}

          {/* Links */}
          <div className="flex gap-3 text-sm">
            {f.website_url && <a href={f.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">🌐 Website</a>}
            {f.instagram && <a href={`https://instagram.com/${f.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">📸 Instagram</a>}
            {f.facebook_url && <a href={f.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">👤 Facebook</a>}
          </div>
          {f.address && <p className="text-sm text-muted-foreground">📍 {f.address}</p>}
        </div>
      </div>

      <Separator />

      {/* Events */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{t('events')} ({venueEvents.length})</h2>
        {venueEvents.length === 0 ? (
          <p className="text-muted-foreground">{t('noEvents')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {venueEvents.slice(0, 20).map((event) => {
              const tz = event.fields.timezone || 'Asia/Taipei';
              const artist = resolveLinks(event.fields.primary_artist, artists)[0];
              return (
                <Card key={event.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                    </div>
                    <CardTitle className="text-sm">
                      {event.fields.title || event.fields.title_local || event.fields.title_en || 'Event'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {artist && <p>🎤 {displayName(artist.fields)}</p>}
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
