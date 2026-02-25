export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getVenues, getEvents, getArtists, getCities, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, formatTime, localized } from '@/lib/helpers';
import HeroReveal from '@/components/animations/HeroReveal';
import CountUp from '@/components/animations/CountUp';
import FadeUp from '@/components/animations/FadeUp';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');

  const [venues, events, artists, cities] = await Promise.all([getVenues(), getEvents(), getArtists(), getCities()]);
  const cityMap = new Map(cities.map((c) => [c.id, c.fields]));

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

          {/* Stats — clickable links to respective pages */}
          <div className="hero-stats grid grid-cols-4 gap-6 sm:gap-8 border-t border-[rgba(240,237,230,0.06)] pt-10 mt-12">
            <Link href={`/${locale}/cities`} className="hero-stat-item group cursor-pointer">
              <CountUp end={cities.length} className="stat-number text-4xl sm:text-6xl lg:text-8xl text-gold group-hover:text-[#E8C868] transition-colors duration-300" />
              <p className="mt-3 text-xs sm:text-sm uppercase tracking-widest text-[#8A8578] group-hover:text-[#F0EDE6] transition-colors duration-300">{t('cities')}</p>
            </Link>
            <Link href={`/${locale}/venues`} className="hero-stat-item group cursor-pointer">
              <CountUp end={venues.length} className="stat-number text-4xl sm:text-6xl lg:text-8xl text-[#F0EDE6] group-hover:text-gold transition-colors duration-300" />
              <p className="mt-3 text-xs sm:text-sm uppercase tracking-widest text-[#8A8578] group-hover:text-[#F0EDE6] transition-colors duration-300">{t('venues')}</p>
            </Link>
            <Link href={`/${locale}/events`} className="hero-stat-item group cursor-pointer">
              <CountUp end={events.length} className="stat-number text-4xl sm:text-6xl lg:text-8xl text-[#F0EDE6] group-hover:text-gold transition-colors duration-300" />
              <p className="mt-3 text-xs sm:text-sm uppercase tracking-widest text-[#8A8578] group-hover:text-[#F0EDE6] transition-colors duration-300">{t('events')}</p>
            </Link>
            <Link href={`/${locale}/artists`} className="hero-stat-item group cursor-pointer">
              <CountUp end={artists.length} className="stat-number text-4xl sm:text-6xl lg:text-8xl text-[#F0EDE6] group-hover:text-gold transition-colors duration-300" />
              <p className="mt-3 text-xs sm:text-sm uppercase tracking-widest text-[#8A8578] group-hover:text-[#F0EDE6] transition-colors duration-300">{t('artists')}</p>
            </Link>
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
                <h3 className="font-serif text-xl font-bold group-hover:text-gold transition-colors duration-300">
                  {displayName(venue.fields)}
                </h3>
                <p className="mt-2 text-xs uppercase tracking-widest text-[#8A8578]">
                  {(() => { const c = venue.fields.city_id?.[0] ? cityMap.get(venue.fields.city_id[0]) : null; return c ? (locale === 'en' ? c.name_en : c.name_local) || '' : ''; })()} · {venue.fields.event_list?.length || 0} events
                </p>
                {venue.fields.jazz_frequency && (
                  <p className="mt-1 text-xs text-[#6A6560] capitalize">{venue.fields.jazz_frequency}</p>
                )}
              </Link>
            ))}
          </div>
        </FadeUp>
      </section>
    </div>
  );
}
