export const revalidate = 300;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getVenues, getEvents, getArtists, getCities, getLineups, getTags, resolveLinks, buildMap, buildVenueEventCounts, venueEventCount, getFeaturedMagazineArticles } from '@/lib/supabase';
import { displayName, artistDisplayName, formatDate, formatTime, cityName, eventTitle, relativeEventDate, isEventLive, isEventTonight } from '@/lib/helpers';
import HeroReveal from '@/components/animations/HeroReveal';
import CountUp from '@/components/animations/CountUp';
import ManifestoReveal from '@/components/animations/ManifestoReveal';
import HomeEventsSection from '@/components/HomeEventsSection';
import TonightSection from '@/components/TonightSection';
import RegionExploreRow from '@/components/RegionExploreRow';
import MagazineCarousel from '@/components/MagazineCarousel';
import FadeUp from '@/components/animations/FadeUp';
import { localized } from '@/lib/helpers';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const tRegions = await getTranslations('regions');

  const [venues, events, artists, cities, lineups, tags, featuredArticles] = await Promise.all([
    getVenues(), getEvents(), getArtists(), getCities(), getLineups(), getTags().catch(() => []),
    getFeaturedMagazineArticles().catch(() => []),
  ]);
  const cityMap = new Map(cities.map((c) => [c.id, c.fields]));
  const venuesWithEvents = venues.filter((v) => v.fields.event_list && v.fields.event_list.length > 0);
  const activeCities = cities.filter((c) => venuesWithEvents.some((v) => v.fields.city_id?.includes(c.id)));

  const now = new Date().toISOString();
  const sevenDaysLater = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Pre-build lookup maps for upcoming event enrichment
  const artistMap = buildMap(artists);
  const tagMap = buildMap(tags);

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

  // Serialize upcoming events for HomeEventsSection client component
  const venueMap = buildMap(venues);
  const upcomingAll = events
    .filter((e) => {
      if (!e.fields.start_at || e.fields.start_at < now) return false;
      const eventTags = resolveLinks(e.fields.tag_list, tagMap).map((t) => t.fields.name?.toLowerCase());
      return !eventTags.includes('jam session');
    })
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));

  const homeEvents = upcomingAll.slice(0, 30).map((event) => {
    const tz = event.fields.timezone || 'Asia/Taipei';
    const venue = resolveLinks(event.fields.venue_id, venueMap)[0];
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

    const rel = relativeEventDate(event.fields.start_at, locale, tz);
    return {
      id: event.id,
      title: eventTitle(event.fields, locale),
      start_at: event.fields.start_at || null,
      end_at: event.fields.end_at || null,
      timezone: tz,
      venue_name: venue ? displayName(venue.fields) : '',
      venue_address: venue?.fields.address_local || venue?.fields.address_en || '',
      city_name: city ? cityName(city, locale) : '',
      country_code: city?.country_code || '',
      relative_label: rel.label,
      time_display: rel.time,
      sidemen,
      tags: eventTags,
    };
  });

  // Serialize weekly jams with country_code
  const homeJams = weeklyJams.map((event) => {
    const tz = event.fields.timezone || 'Asia/Taipei';
    const venue = resolveLinks(event.fields.venue_id, venueMap)[0];
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
    const relJam = relativeEventDate(event.fields.start_at, locale, tz);
    return {
      id: event.id,
      title: eventTitle(event.fields, locale),
      start_at: event.fields.start_at || null,
      end_at: event.fields.end_at || null,
      timezone: tz,
      venue_name: venue ? displayName(venue.fields) : '',
      venue_address: venue?.fields.address_local || venue?.fields.address_en || '',
      city_name: city ? cityName(city, locale) : '',
      country_code: city?.country_code || '',
      relative_label: relJam.label,
      time_display: relJam.time,
      sidemen,
      tags: eventTags,
    };
  });

  // Serialize featured venues with country_code
  const venueCountsFallback = buildVenueEventCounts(events);
  const featured = [...venuesWithEvents]
    .sort((a, b) => venueEventCount(b, venueCountsFallback) - venueEventCount(a, venueCountsFallback))
    .slice(0, 12);

  const homeVenues = featured.map((venue) => {
    const city = venue.fields.city_id?.[0] ? cityMap.get(venue.fields.city_id[0]) : null;
    return {
      id: venue.id,
      name: displayName(venue.fields),
      city_name: city ? cityName(city, locale) : '',
      country_code: city?.country_code || '',
      event_count: venueEventCount(venue, venueCountsFallback),
      jazz_frequency: venue.fields.jazz_frequency || null,
    };
  });

  // ─── Tonight & This Week events for TonightSection ───
  const oneDayLater = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();
  const serializeTonightEvent = (event: typeof events[number]) => {
    const tz = event.fields.timezone || 'Asia/Taipei';
    const venue = resolveLinks(event.fields.venue_id, venueMap)[0];
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
    const rel = relativeEventDate(event.fields.start_at, locale, tz);
    return {
      id: event.id,
      title: eventTitle(event.fields, locale),
      start_at: event.fields.start_at || null,
      end_at: event.fields.end_at || null,
      timezone: tz,
      venue_name: venue ? displayName(venue.fields) : '',
      venue_address: venue?.fields.address_local || venue?.fields.address_en || '',
      city_name: city ? cityName(city, locale) : '',
      country_code: city?.country_code || '',
      relative_label: rel.label,
      time_display: rel.time,
      sidemen,
      tags: eventTags,
      source_url: event.fields.source_url || null,
      is_live: isEventLive(event.fields.start_at, event.fields.end_at),
    };
  };

  // Tonight: events starting today (all types including jams)
  const tonightAll = events
    .filter((e) => e.fields.start_at && isEventTonight(e.fields.start_at, e.fields.timezone || 'Asia/Taipei'))
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));
  const tonightEvents = tonightAll.map(serializeTonightEvent);

  // This week (fallback): next 7 days excluding today
  const thisWeekAll = events
    .filter((e) => {
      if (!e.fields.start_at || e.fields.start_at < oneDayLater || e.fields.start_at > sevenDaysLater) return false;
      return true;
    })
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));
  const thisWeekEvents = thisWeekAll.slice(0, 12).map(serializeTonightEvent);

  // Count tonight events for MobileTabBar badge (passed via data attribute)
  const tonightCount = tonightAll.length;

  // Collect region codes that have actual content (for RegionExploreRow + fallback)
  const allCountryCodes = [
    ...homeEvents.map((e) => e.country_code),
    ...homeJams.map((e) => e.country_code),
    ...homeVenues.map((v) => v.country_code),
    ...tonightEvents.map((e) => e.country_code),
  ].filter(Boolean);
  const regionCodesInUse = [...new Set(allCountryCodes)];
  const regionLabelsMap: Record<string, string> = {};
  for (const code of regionCodesInUse) {
    try { regionLabelsMap[code] = tRegions(code as 'TW'); } catch { regionLabelsMap[code] = code; }
  }

  return (
    <div className="space-y-24" data-tonight-count={tonightCount}>
      {/* ─── 1. Hero + Stats ─── */}
      <section>
        <HeroReveal>
          <h2 className="hero-title text-5xl sm:text-7xl lg:text-[8rem] text-[var(--foreground)]">
            <span className="hero-line block">Jazz.</span>
            <span className="hero-line block text-gold">Live.</span>
            <span className="hero-line block">Connected.</span>
          </h2>
          <p className="hero-tagline mt-8 max-w-lg text-lg text-[var(--muted-foreground)] leading-relaxed">
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

      {/* ─── 2. Region Explore Row (World Map) ─── */}
      <RegionExploreRow
        regionCodes={regionCodesInUse}
        regionLabels={regionLabelsMap}
        worldMapLabel={tRegions('worldMap')}
      />

      {/* ─── 3. 🔥 Today's Jazz ─── */}
      <TonightSection
        locale={locale}
        tonightEvents={tonightEvents}
        thisWeekEvents={thisWeekEvents}
        labels={{
          tonightEvents: t('tonightEvents'),
          tonightEmpty: t('tonightEmpty'),
          thisWeek: t('thisWeek'),
          viewAll: t('viewAll'),
          live: t('live'),
          addToCalendar: t('addToCalendar'),
          share: t('share'),
        }}
      />

      {/* ─── 4-6. Jams → Events → Venues ─── */}
      <HomeEventsSection
        locale={locale}
        events={homeEvents}
        jams={homeJams}
        venues={homeVenues}
        labels={{
          upcomingEvents: t('upcomingEvents'),
          weeklyJam: t('weeklyJam'),
          featuredVenues: t('featuredVenues'),
          viewAll: t('viewAll'),
          noEvents: t('noEvents'),
          jazzNightly: t('jazzNightly'),
          jazzWeekends: t('jazzWeekends'),
          jazzOccasional: t('jazzOccasional'),
        }}
      />

      {/* ─── 7. Magazine Carousel ─── */}
      {featuredArticles.length > 0 && (
        <FadeUp>
          <MagazineCarousel
            articles={featuredArticles.map((a) => ({
              id: a.id,
              slug: a.slug,
              title: localized(a as unknown as Record<string, unknown>, 'title', locale) || a.slug,
              excerpt: localized(a as unknown as Record<string, unknown>, 'excerpt', locale) || '',
              cover_image_url: a.cover_image_url || null,
              category: a.category,
              categoryLabel: t(({
                'artist-feature': 'magazineCatArtist',
                'venue-spotlight': 'magazineCatVenue',
                'scene-report': 'magazineCatScene',
                'culture': 'magazineCatCulture',
              } as Record<string, string>)[a.category] || 'magazineCatCulture'),
              author_name: a.author_name || null,
              published_at: a.published_at || null,
            }))}
            locale={locale}
            labels={{
              magazine: t('magazineTitle'),
              viewAll: t('viewAll'),
            }}
          />
        </FadeUp>
      )}

      {/* ─── Brand Manifesto (bottom — returning visitors scroll past) ─── */}
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
    </div>
  );
}
