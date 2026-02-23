import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getVenues, getEvents, getArtists, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, formatTime, photoUrl, localized } from '@/lib/helpers';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');

  const [venues, events, artists] = await Promise.all([getVenues(), getEvents(), getArtists()]);

  const now = new Date().toISOString();
  const upcoming = events
    .filter((e) => e.fields.start_at && e.fields.start_at >= now)
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
    .slice(0, 6);

  const featured = [...venues]
    .sort((a, b) => (b.fields.event_list?.length || 0) - (a.fields.event_list?.length || 0))
    .slice(0, 6);

  return (
    <div className="space-y-32">
      {/* ─── Hero ─── */}
      <section className="pt-24 pb-16">
        <h1 className="hero-title text-6xl sm:text-8xl lg:text-[10rem] text-[#F0EDE6]">
          Jazz.
          <br />
          <span className="text-gold">Live.</span>
          <br />
          Connected.
        </h1>
        <p className="mt-8 max-w-lg text-lg text-[#8A8578] leading-relaxed">
          {t('tagline')}
        </p>
      </section>

      {/* ─── Stats (Microfeller-style giant numbers) ─── */}
      <section className="grid grid-cols-3 gap-8 border-t border-[rgba(240,237,230,0.06)] pt-16">
        <div>
          <p className="stat-number text-6xl sm:text-8xl text-gold">{venues.length}</p>
          <p className="mt-3 text-sm uppercase tracking-widest text-[#8A8578]">{t('venues')}</p>
        </div>
        <div>
          <p className="stat-number text-6xl sm:text-8xl text-[#F0EDE6]">{artists.length}</p>
          <p className="mt-3 text-sm uppercase tracking-widest text-[#8A8578]">{t('artists')}</p>
        </div>
        <div>
          <p className="stat-number text-6xl sm:text-8xl text-[#F0EDE6]">{events.length}</p>
          <p className="mt-3 text-sm uppercase tracking-widest text-[#8A8578]">{t('events')}</p>
        </div>
      </section>

      {/* ─── Upcoming Events ─── */}
      <section>
        <div className="flex items-end justify-between mb-12 border-b border-[rgba(240,237,230,0.06)] pb-6">
          <h2 className="font-serif text-4xl sm:text-5xl font-bold">{t('upcomingEvents')}</h2>
          <Link href={`/${locale}/events`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors">
            {t('viewAll')} →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-[#8A8578]">{t('noEvents')}</p>
        ) : (
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 bg-[rgba(240,237,230,0.04)]">
            {upcoming.map((event) => {
              const tz = event.fields.timezone || 'Asia/Taipei';
              const venue = resolveLinks(event.fields.venue_id, venues)[0];
              const artist = resolveLinks(event.fields.primary_artist, artists)[0];
              return (
                <article key={event.id} className="bg-[#0A0A0A] p-6 card-hover group">
                  {event.fields.poster_url && (
                    <div className="h-52 overflow-hidden mb-5 -mx-6 -mt-6">
                      <img
                        src={event.fields.poster_url}
                        alt={event.fields.title || ''}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="text-xs uppercase tracking-widest text-gold mb-3">
                    {formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                  </div>
                  <h3 className="font-serif text-xl font-bold leading-tight mb-3 group-hover:text-gold transition-colors duration-300">
                    {event.fields.title || event.fields.title_local || event.fields.title_en || 'Untitled'}
                  </h3>
                  <div className="text-sm text-[#8A8578] space-y-1">
                    {localized(event.fields as Record<string, unknown>, 'description_short', locale) && (
                      <p className="text-xs leading-relaxed line-clamp-2">
                        {localized(event.fields as Record<string, unknown>, 'description_short', locale)}
                      </p>
                    )}
                    {venue && <p>↗ {displayName(venue.fields)}</p>}
                    {artist && <p>♪ {displayName(artist.fields)}</p>}
                  </div>
                  {event.fields.ticket_url && (
                    <a
                      href={event.fields.ticket_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-4 text-xs uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors"
                    >
                      {t('ticketLink')} ↗
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Venues ─── */}
      <section>
        <div className="flex items-end justify-between mb-12 border-b border-[rgba(240,237,230,0.06)] pb-6">
          <h2 className="font-serif text-4xl sm:text-5xl font-bold">{t('featuredVenues')}</h2>
          <Link href={`/${locale}/venues`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors">
            {t('viewAll')} →
          </Link>
        </div>
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3 bg-[rgba(240,237,230,0.04)]">
          {featured.map((venue) => (
            <Link key={venue.id} href={`/${locale}/venues/${venue.id}`} className="block bg-[#0A0A0A] p-6 card-hover group">
              {photoUrl(venue.fields.photo_url, venue.fields.photo_file) && (
                <div className="h-44 overflow-hidden mb-5 -mx-6 -mt-6">
                  <img
                    src={photoUrl(venue.fields.photo_url, venue.fields.photo_file)!}
                    alt={displayName(venue.fields)}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                  />
                </div>
              )}
              <h3 className="font-serif text-xl font-bold group-hover:text-gold transition-colors duration-300">
                {displayName(venue.fields)}
              </h3>
              <p className="mt-2 text-xs uppercase tracking-widest text-[#8A8578]">
                {venue.fields.city} · {venue.fields.event_list?.length || 0} events
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
