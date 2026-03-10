export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getVenues, getEvents, getArtists, getCities, getLineups, getTags, resolveLinks, buildMap, buildVenueEventCounts, venueEventCount } from '@/lib/airtable';
import { displayName, artistDisplayName, formatDate, formatTime, cityName, eventTitle } from '@/lib/helpers';
import HeroReveal from '@/components/animations/HeroReveal';
import CountUp from '@/components/animations/CountUp';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import ManifestoReveal from '@/components/animations/ManifestoReveal';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');

  const [venues, events, artists, cities, lineups, tags] = await Promise.all([
    getVenues(), getEvents(), getArtists(), getCities(), getLineups(), getTags().catch(() => []),
  ]);
  const cityMap = new Map(cities.map((c) => [c.id, c.fields]));
  const venuesWithEvents = venues.filter((v) => v.fields.event_list && v.fields.event_list.length > 0);
  const activeCities = cities.filter((c) => venuesWithEvents.some((v) => v.fields.city_id?.includes(c.id)));

  const now = new Date().toISOString();
  const sevenDaysLater = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Pre-build lookup maps for upcoming event enrichment
  const artistMap = buildMap(artists);
  const tagMap = buildMap(tags);

  const upcoming = events
    .filter((e) => {
      if (!e.fields.start_at || e.fields.start_at < now) return false;
      const eventTags = resolveLinks(e.fields.tag_list, tagMap).map((t) => t.fields.name?.toLowerCase());
      return !eventTags.includes('jam session');
    })
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
    .slice(0, 9);

  // Filter jam sessions within the next 7 days
  const weeklyJams = events
    .filter((e) => {
      if (!e.fields.start_at || e.fields.start_at < now || e.fields.start_at > sevenDaysLater) return false;
      const eventTags = resolveLinks(e.fields.tag_list, tagMap).map((t) => t.fields.name?.toLowerCase());
      return eventTags.includes('jam session');
    })
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));

  // Index lineups by event id
  const lineupsByEvent = new Map<string, typeof lineups>();
  for (const l of lineups) {
    for (const eid of l.fields.event_id || []) {
      const arr = lineupsByEvent.get(eid);
      if (arr) arr.push(l);
      else lineupsByEvent.set(eid, [l]);
    }
  }

  const venueCountsFallback = buildVenueEventCounts(events);
  const featured = [...venuesWithEvents]
    .sort((a, b) => venueEventCount(b, venueCountsFallback) - venueEventCount(a, venueCountsFallback))
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
          <div className="hero-stats grid grid-cols-4 gap-6 sm:gap-8 border-t border-[var(--border)] pt-10 mt-12">
            <Link href={`/${locale}/cities`} className="hero-stat-item group cursor-pointer">
              <CountUp end={activeCities.length} className="stat-number text-4xl sm:text-6xl lg:text-8xl text-gold group-hover:text-[var(--color-gold-bright)] transition-colors duration-300" />
              <p className="mt-3 text-xs sm:text-sm uppercase tracking-widest text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors duration-300">{t('cities')}</p>
            </Link>
            <Link href={`/${locale}/venues`} className="hero-stat-item group cursor-pointer">
              <CountUp end={venuesWithEvents.length} className="stat-number text-4xl sm:text-6xl lg:text-8xl text-[var(--foreground)] group-hover:text-gold transition-colors duration-300" />
              <p className="mt-3 text-xs sm:text-sm uppercase tracking-widest text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors duration-300">{t('venues')}</p>
            </Link>
            <Link href={`/${locale}/events`} className="hero-stat-item group cursor-pointer">
              <CountUp end={events.length} className="stat-number text-4xl sm:text-6xl lg:text-8xl text-[var(--foreground)] group-hover:text-gold transition-colors duration-300" />
              <p className="mt-3 text-xs sm:text-sm uppercase tracking-widest text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors duration-300">{t('events')}</p>
            </Link>
            <Link href={`/${locale}/artists`} className="hero-stat-item group cursor-pointer">
              <CountUp end={artists.length} className="stat-number text-4xl sm:text-6xl lg:text-8xl text-[var(--foreground)] group-hover:text-gold transition-colors duration-300" />
              <p className="mt-3 text-xs sm:text-sm uppercase tracking-widest text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors duration-300">{t('artists')}</p>
            </Link>
          </div>
        </HeroReveal>
      </section>

      {/* ─── Brand Manifesto ─── */}
      <section className="manifesto-section relative">
        <ManifestoReveal>
          <div className="relative pl-8 sm:pl-12 max-w-2xl">
            <div className="manifesto-accent absolute left-0 top-0 bottom-0 w-px bg-gold" />
            <div className="space-y-5 sm:space-y-6">
              <p className="manifesto-line font-serif text-lg sm:text-xl leading-relaxed text-[var(--foreground)]">
                {t('manifestoL1')}
              </p>
              <p className="manifesto-line text-sm sm:text-base leading-relaxed text-[var(--muted-foreground)]">
                {t('manifestoL2')}
              </p>
              <p className="manifesto-line text-sm sm:text-base leading-relaxed text-[var(--muted-foreground)]">
                {t('manifestoL3')}
              </p>
              <p className="manifesto-line font-serif text-base sm:text-lg leading-relaxed text-[var(--foreground)]">
                {t('manifestoL4')}
              </p>
            </div>
            <p className="manifesto-attr mt-10 text-xs uppercase tracking-[0.3em] text-gold">
              ── JazzNode
            </p>
          </div>
        </ManifestoReveal>
      </section>

      {/* ─── Upcoming Events ─── */}
      <section>
        <FadeUp>
          <div className="flex items-end justify-between mb-12 border-b border-[var(--border)] pb-6">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold">{t('upcomingEvents')}</h2>
            <Link href={`/${locale}/events`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift">
              {t('viewAll')} →
            </Link>
          </div>
        </FadeUp>

        {upcoming.length === 0 ? (
          <p className="text-[#8A8578]">{t('noEvents')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event, i) => {
              const tz = event.fields.timezone || 'Asia/Taipei';
              const venue = resolveLinks(event.fields.venue_id, venues)[0];
              const city = venue?.fields.city_id?.[0] ? cityMap.get(venue.fields.city_id[0]) : null;
              const primaryArtist = resolveLinks(event.fields.primary_artist, artistMap)[0];
              const eventLineups = (lineupsByEvent.get(event.id) || [])
                .sort((a, b) => (a.fields.order || 99) - (b.fields.order || 99));
              const sidemen = eventLineups
                .filter((l) => l.fields.role !== 'ensemble')
                .map((l) => resolveLinks(l.fields.artist_id, artistMap)[0])
                .filter(Boolean)
                .filter((a) => a.id !== primaryArtist?.id)
                .map((a) => artistDisplayName(a.fields, locale));
              const eventTags = resolveLinks(event.fields.tag_list, tagMap)
                .map((tag) => tag.fields.name)
                .filter(Boolean) as string[];

              return (
                <FadeUpItem key={event.id} delay={(i % 3) * 60} className={i >= 6 ? 'hidden sm:block' : undefined}>
                <Link href={`/${locale}/events/${event.id}`} className="block bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] card-hover group h-full">
                  {venue && (
                    <p className="text-[10px] uppercase tracking-widest text-[#8A8578] mb-1">{city ? `${cityName(city, locale)} · ` : ''}{displayName(venue.fields)}</p>
                  )}
                  <div className="text-xs uppercase tracking-widest text-gold mb-2">
                    {eventTags.includes('matinee') && '☀️ '}{formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                  </div>
                  <h3 className="font-serif text-lg font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
                    {eventTitle(event.fields, locale)}
                  </h3>
                  {sidemen.length > 0 && (
                    <p className="text-xs text-[#6A6560] mt-2">
                      w/ {sidemen.join(', ')}
                    </p>
                  )}
                  {eventTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {eventTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold/8 text-gold/70 border border-gold/15"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
                </FadeUpItem>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Weekly Open Jam ─── */}
      {weeklyJams.length > 0 && (
        <section>
          <FadeUp>
            <div className="flex items-end justify-between mb-12 border-b border-[var(--border)] pb-6">
              <h2 className="font-serif text-4xl sm:text-5xl font-bold">{t('weeklyJam')}</h2>
              <Link href={`/${locale}/events?category=jam`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift">
                {t('viewAll')} →
              </Link>
            </div>
          </FadeUp>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {weeklyJams.map((event, i) => {
              const tz = event.fields.timezone || 'Asia/Taipei';
              const venue = resolveLinks(event.fields.venue_id, venues)[0];
              const city = venue?.fields.city_id?.[0] ? cityMap.get(venue.fields.city_id[0]) : null;
              const primaryArtist = resolveLinks(event.fields.primary_artist, artistMap)[0];
              const eventLineups = (lineupsByEvent.get(event.id) || [])
                .sort((a, b) => (a.fields.order || 99) - (b.fields.order || 99));
              const sidemen = eventLineups
                .filter((l) => l.fields.role !== 'ensemble')
                .map((l) => resolveLinks(l.fields.artist_id, artistMap)[0])
                .filter(Boolean)
                .filter((a) => a.id !== primaryArtist?.id)
                .map((a) => artistDisplayName(a.fields, locale));
              const eventTags = resolveLinks(event.fields.tag_list, tagMap)
                .map((tag) => tag.fields.name)
                .filter(Boolean) as string[];

              return (
                <FadeUpItem key={event.id} delay={(i % 3) * 60}>
                <Link href={`/${locale}/events/${event.id}`} className="block bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] card-hover group h-full">
                  {venue && (
                    <p className="text-[10px] uppercase tracking-widest text-[#8A8578] mb-1">{city ? `${cityName(city, locale)} · ` : ''}{displayName(venue.fields)}</p>
                  )}
                  <div className="text-xs uppercase tracking-widest text-gold mb-2">
                    {eventTags.includes('matinee') && '☀️ '}{formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                  </div>
                  <h3 className="font-serif text-lg font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
                    {eventTitle(event.fields, locale)}
                  </h3>
                  {sidemen.length > 0 && (
                    <p className="text-xs text-[#6A6560] mt-2">
                      w/ {sidemen.join(', ')}
                    </p>
                  )}
                  {eventTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {eventTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold/8 text-gold/70 border border-gold/15"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
                </FadeUpItem>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Venues ─── */}
      <section>
        <FadeUp>
          <div className="flex items-end justify-between mb-12 border-b border-[var(--border)] pb-6">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold">{t('featuredVenues')}</h2>
            <Link href={`/${locale}/venues`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift">
              {t('viewAll')} →
            </Link>
          </div>
        </FadeUp>
        <FadeUp stagger={0.15}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((venue) => (
              <Link key={venue.id} href={`/${locale}/venues/${venue.id}`} className="fade-up-item block bg-[var(--card)] p-6 card-hover group border border-[var(--border)]">
                <h3 className="font-serif text-xl font-bold group-hover:text-gold transition-colors duration-300">
                  {displayName(venue.fields)}
                </h3>
                <p className="mt-2 text-xs uppercase tracking-widest text-[#8A8578]">
                  {(() => { const c = venue.fields.city_id?.[0] ? cityMap.get(venue.fields.city_id[0]) : null; return c ? cityName(c, locale) : ''; })()} · {venueEventCount(venue, venueCountsFallback)} events
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
