import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getVenues, getEvents, getArtists, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, formatTime, photoUrl, localized } from '@/lib/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');

  // Fetch all data at build time
  const [venues, events, artists] = await Promise.all([getVenues(), getEvents(), getArtists()]);

  // Upcoming events (sorted by date, next 10)
  const now = new Date().toISOString();
  const upcoming = events
    .filter((e) => e.fields.start_at && e.fields.start_at >= now)
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
    .slice(0, 10);

  // Featured venues (those with most events, top 6)
  const featured = [...venues]
    .sort((a, b) => (b.fields.event_list?.length || 0) - (a.fields.event_list?.length || 0))
    .slice(0, 6);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          🎵 JazzNode
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">{t('tagline')}</p>
        <div className="mt-6 flex justify-center gap-4 text-sm text-muted-foreground">
          <span>{venues.length} {t('venues')}</span>
          <span>·</span>
          <span>{artists.length} {t('artists')}</span>
          <span>·</span>
          <span>{events.length} {t('events')}</span>
        </div>
      </section>

      {/* Upcoming Events */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t('upcomingEvents')}</h2>
          <Link href={`/${locale}/events`} className="text-sm text-muted-foreground hover:text-foreground">
            {t('viewAll')} →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">{t('noEvents')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => {
              const tz = event.fields.timezone || 'Asia/Taipei';
              const venue = resolveLinks(event.fields.venue_id, venues)[0];
              const artist = resolveLinks(event.fields.primary_artist, artists)[0];
              return (
                <Card key={event.id} className="hover:shadow-md transition-shadow overflow-hidden">
                  {event.fields.poster_url && (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={event.fields.poster_url}
                        alt={event.fields.title || ''}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                    </div>
                    <CardTitle className="text-base leading-tight">
                      {event.fields.title || event.fields.title_local || event.fields.title_en || 'Untitled Event'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    {localized(event.fields as Record<string, unknown>, 'description_short', locale) && (
                      <p className="text-xs italic">{localized(event.fields as Record<string, unknown>, 'description_short', locale)}</p>
                    )}
                    {venue && <p>📍 {displayName(venue.fields)}</p>}
                    {artist && (
                      <div>
                        <p>🎤 {displayName(artist.fields)}</p>
                        {localized(artist.fields as Record<string, unknown>, 'bio_short', locale) && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{localized(artist.fields as Record<string, unknown>, 'bio_short', locale)}</p>
                        )}
                      </div>
                    )}
                    {event.fields.ticket_url && (
                      <a
                        href={event.fields.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-block mt-1"
                      >
                        {t('ticketLink')} ↗
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Venues */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t('featuredVenues')}</h2>
          <Link href={`/${locale}/venues`} className="text-sm text-muted-foreground hover:text-foreground">
            {t('viewAll')} →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((venue) => (
            <Link key={venue.id} href={`/${locale}/venues/${venue.id}`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                {photoUrl(venue.fields.photo_url, venue.fields.photo_file) && (
                  <div className="h-40 overflow-hidden rounded-t-lg">
                    <img
                      src={photoUrl(venue.fields.photo_url, venue.fields.photo_file)!}
                      alt={displayName(venue.fields)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-base">{displayName(venue.fields)}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {venue.fields.city} · {venue.fields.event_list?.length || 0} events
                  </p>
                  {venue.fields.verification_status === 'Verified' && (
                    <Badge variant="secondary" className="w-fit text-xs">{t('verified')} ✓</Badge>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
