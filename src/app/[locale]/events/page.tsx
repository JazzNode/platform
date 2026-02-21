import { getTranslations } from 'next-intl/server';
import { getEvents, getVenues, getArtists, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, formatTime } from '@/lib/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('events') };
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');

  const [events, venues, artists] = await Promise.all([getEvents(), getVenues(), getArtists()]);

  // Sort by date, upcoming first
  const sorted = [...events].sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''));

  // Group by month
  const byMonth = new Map<string, typeof events>();
  for (const e of sorted) {
    const d = e.fields.start_at ? new Date(e.fields.start_at) : null;
    const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Unknown';
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(e);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">{t('events')}</h1>
        <p className="text-muted-foreground mt-1">{events.length} events</p>
      </div>

      {[...byMonth.entries()].map(([month, monthEvents]) => (
        <section key={month}>
          <h2 className="text-xl font-semibold mb-4">{month}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {monthEvents.map((event) => {
              const venue = resolveLinks(event.fields.venue_list, venues)[0];
              const artist = resolveLinks(event.fields.primary_artist, artists)[0];
              return (
                <Card key={event.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(event.fields.start_at, locale)} · {formatTime(event.fields.start_at)}
                    </div>
                    <CardTitle className="text-sm">
                      {event.fields.title_local || event.fields.title_en || 'Event'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    {venue && <p>📍 {displayName(venue.fields)}</p>}
                    {artist && <p>🎤 {displayName(artist.fields)}</p>}
                    {event.fields.ticket_url && (
                      <a
                        href={event.fields.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {t('ticketLink')} ↗
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
