export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getEvents, getVenues, getArtists, getLineups, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, formatTime, localized } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('events') };
}

export default async function EventsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ view?: string }> }) {
  const { locale } = await params;
  const { view } = await searchParams;
  const t = await getTranslations('common');
  const showPast = view === 'past';

  const [events, venues, artists, lineups] = await Promise.all([getEvents(), getVenues(), getArtists(), getLineups()]);

  const now = new Date().toISOString();
  const upcoming = events
    .filter((e) => e.fields.start_at && e.fields.start_at >= now)
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));
  const past = events
    .filter((e) => e.fields.start_at && e.fields.start_at < now)
    .sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''));

  const displayEvents = showPast ? past : upcoming;

  // Group by month
  const byMonth = new Map<string, typeof events>();
  for (const e of displayEvents) {
    const d = e.fields.start_at ? new Date(e.fields.start_at) : null;
    const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Unknown';
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(e);
  }

  return (
    <div className="space-y-16">
      <FadeUp>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold">
              {showPast ? t('pastEvents') : t('events')}
            </h1>
            <p className="text-[#8A8578] mt-2 text-sm uppercase tracking-widest">
              {displayEvents.length} {showPast ? t('pastCount') : t('upcomingCount')}
            </p>
          </div>
          <Link
            href={`/${locale}/events${showPast ? '' : '?view=past'}`}
            className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift"
          >
            {showPast ? `← ${t('events')}` : `${t('pastEvents')} →`}
          </Link>
        </div>
      </FadeUp>

      {displayEvents.length === 0 && (
        <p className="text-[#8A8578]">{t('noEvents')}</p>
      )}

      {[...byMonth.entries()].map(([month, monthEvents]) => (
        <section key={month}>
          <FadeUp>
            <h2 className="font-serif text-2xl font-bold mb-6 text-gold">{month}</h2>
          </FadeUp>
          <FadeUp stagger={0.12}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {monthEvents.map((event) => {
                const tz = event.fields.timezone || 'Asia/Taipei';
                const venue = resolveLinks(event.fields.venue_id, venues)[0];
                const primaryArtist = resolveLinks(event.fields.primary_artist, artists)[0];
                // Get all lineup artists for this event
                const eventLineups = lineups.filter((l) =>
                  l.fields.event_id?.some((eid) => eid === event.id)
                ).sort((a, b) => (a.fields.order || 99) - (b.fields.order || 99));
                const lineupArtists = eventLineups
                  .map((l) => resolveLinks(l.fields.artist_id, artists)[0])
                  .filter(Boolean)
                  .filter((a) => a.id !== primaryArtist?.id); // exclude primary from "sidemen"

                return (
                  <Link key={event.id} href={`/${locale}/events/${event.id}`} className="fade-up-item block bg-[#111111] p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover group">
                    <div className="text-xs uppercase tracking-widest text-gold mb-2">
                      {formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                    </div>
                    <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
                      {event.fields.title || event.fields.title_local || event.fields.title_en || 'Event'}
                    </h3>
                    <div className="text-xs text-[#8A8578] mt-2 space-y-0.5">
                      {localized(event.fields as Record<string, unknown>, 'description_short', locale) && (
                        <p className="line-clamp-2 italic">{localized(event.fields as Record<string, unknown>, 'description_short', locale)}</p>
                      )}
                      {venue && <p>↗ {displayName(venue.fields)}</p>}
                      {primaryArtist && (
                        <p>♪ {displayName(primaryArtist.fields)}</p>
                      )}
                      {lineupArtists.length > 0 && (
                        <p className="text-[#6A6560]">
                          w/ {lineupArtists.map((a) => displayName(a.fields)).join(', ')}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </FadeUp>
        </section>
      ))}
    </div>
  );
}
