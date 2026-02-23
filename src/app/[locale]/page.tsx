export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getVenues, getEvents, getArtists, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, formatTime, photoUrl, localized } from '@/lib/helpers';
import HeroReveal from '@/components/animations/HeroReveal';
import CountUp from '@/components/animations/CountUp';
import FadeUp from '@/components/animations/FadeUp';

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
    <div className="space-y-24">
      {/* ─── Hero + Stats ─── */}
      <section className="pt-24 pb-16">
        <HeroReveal>
          <h1 className="hero-title text-6xl sm:text-8xl lg:text-[10rem] text-[#F0EDE6]">
            <span className="hero-line block">Jazz.</span>
            <span className="hero-line block text-gold">Live.</span>
            <span className="hero-line block">Connected.</span>
          </h1>
          <p className="hero-tagline mt-8 max-w-lg text-lg text-[#8A8578] leading-relaxed">
            {t('tagline')}
          </p>

          {/* Stats — flows directly after tagline, animated as part of hero sequence */}
          <div className="hero-stats grid grid-cols-3 gap-8 border-t border-[rgba(240,237,230,0.06)] pt-10 mt-12">
            <div className="hero-stat-item">
              <CountUp end={venues.length} className="stat-number text-5xl sm:text-7xl lg:text-8xl text-gold" />
              <p className="mt-3 text-sm uppercase tracking-widest text-[#8A8578]">{t('venues')}</p>
            </div>
            <div className="hero-stat-item">
              <CountUp end={artists.length} className="stat-number text-5xl sm:text-7xl lg:text-8xl text-[#F0EDE6]" />
              <p className="mt-3 text-sm uppercase tracking-widest text-[#8A8578]">{t('artists')}</p>
            </div>
            <div className="hero-stat-item">
              <CountUp end={events.length} className="stat-number text-5xl sm:text-7xl lg:text-8xl text-[#F0EDE6]" />
              <p className="mt-3 text-sm uppercase tracking-widest text-[#8A8578]">{t('events')}</p>
            </div>
          </div>
        </HeroReveal>
      </section>

      {/* ─── Upcoming Events ─── */}
      <section>
        <FadeUp>
          <div className="flex items-end justify-between mb-12 border-b border-[rgba(240,237,230,0.06)] pb-6">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold">{t('upcomingEvents')}</h2>
            <Link href={`/${locale}/events`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift">
              {t('viewAll')} →
            </Link>
          </div>
        </FadeUp>

        {upcoming.length === 0 ? (
          <p className="text-[#8A8578]">{t('noEvents')}</p>
        ) : (
          <FadeUp stagger={0.15}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((event) => {
                const tz = event.fields.timezone || 'Asia/Taipei';
                const venue = resolveLinks(event.fields.venue_id, venues)[0];
                const artist = resolveLinks(event.fields.primary_artist, artists)[0];
                return (
                  <Link key={event.id} href={`/${locale}/events/${event.id}`} className="fade-up-item block bg-[#111111] p-6 card-hover group border border-[rgba(240,237,230,0.06)]">
                    {event.fields.poster_url && (
                      <div className="h-52 overflow-hidden mb-5 -mx-6 -mt-6 rounded-t-[1.25rem]">
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
                        className="inline-block mt-4 text-xs uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift"
                      >
                        {t('ticketLink')} ↗
                      </a>
                    )}
                  </Link>
                );
              })}
            </div>
          </FadeUp>
        )}
      </section>

      {/* ─── Venues ─── */}
      <section>
        <FadeUp>
          <div className="flex items-end justify-between mb-12 border-b border-[rgba(240,237,230,0.06)] pb-6">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold">{t('featuredVenues')}</h2>
            <Link href={`/${locale}/venues`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift">
              {t('viewAll')} →
            </Link>
          </div>
        </FadeUp>
        <FadeUp stagger={0.15}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((venue) => (
              <Link key={venue.id} href={`/${locale}/venues/${venue.id}`} className="fade-up-item block bg-[#111111] p-6 card-hover group border border-[rgba(240,237,230,0.06)]">
                {photoUrl(venue.fields.photo_url, venue.fields.photo_file) && (
                  <div className="h-44 overflow-hidden mb-5 -mx-6 -mt-6 rounded-t-[1.25rem]">
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
        </FadeUp>
      </section>
    </div>
  );
}
