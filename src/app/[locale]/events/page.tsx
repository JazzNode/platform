import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getEvents, getVenues, getArtists, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, formatTime, localized } from '@/lib/helpers';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('events') };
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');

  const [events, venues, artists] = await Promise.all([getEvents(), getVenues(), getArtists()]);

  const sorted = [...events].sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''));

  const byMonth = new Map<string, typeof events>();
  for (const e of sorted) {
    const d = e.fields.start_at ? new Date(e.fields.start_at) : null;
    const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Unknown';
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(e);
  }

  return (
    <div className="space-y-16">
      <div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold">{t('events')}</h1>
        <p className="text-[#8A8578] mt-2 text-sm uppercase tracking-widest">{events.length} events</p>
      </div>

      {[...byMonth.entries()].map(([month, monthEvents]) => (
        <section key={month}>
          <h2 className="font-serif text-2xl font-bold mb-6 text-gold">{month}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {monthEvents.map((event) => {
              const tz = event.fields.timezone || 'Asia/Taipei';
              const venue = resolveLinks(event.fields.venue_id, venues)[0];
              const artist = resolveLinks(event.fields.primary_artist, artists)[0];
              return (
                <Link key={event.id} href={`/${locale}/events/${event.id}`} className="block bg-[#111111] p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover group">
                  {event.fields.poster_url && (
                    <div className="h-40 overflow-hidden mb-4 -mx-5 -mt-5 rounded-t-2xl">
                      <img src={event.fields.poster_url} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" loading="lazy" />
                    </div>
                  )}
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
                    {artist && <p>♪ {displayName(artist.fields)}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
