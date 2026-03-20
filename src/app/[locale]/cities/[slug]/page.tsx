export const revalidate = 3600;
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { getCities, getVenues, getEvents, getArtists, getTags, getLineups, buildMap, resolveLinks } from '@/lib/supabase';
import { artistDisplayName, displayName, photoUrl, formatDate, formatTime, cityName, eventTitle, localized } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import CountUp from '@/components/animations/CountUp';
import EventCarousel from '@/components/EventCarousel';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');
  const cities = await getCities();
  const city = cities.find((c) => c.id === slug);
  if (!city) return {};

  const name = cityName(city.fields, locale);
  const title = `${name} – ${t('cities')}`;
  const description = t('cityPageDescription', { city: name });

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/cities/${slug}`,
      languages: {
        'x-default': `/en/cities/${slug}`,
        en: `/en/cities/${slug}`,
        'zh-Hant': `/zh/cities/${slug}`,
        ja: `/ja/cities/${slug}`,
        ko: `/ko/cities/${slug}`,
        th: `/th/cities/${slug}`,
        id: `/id/cities/${slug}`,
      },
    },
  };
}

export default async function CityDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');

  const [cities, venues, events, artists, tags, lineups] = await Promise.all([
    getCities(), getVenues(), getEvents(), getArtists(), getTags(), getLineups(),
  ]);

  const city = cities.find((c) => c.id === slug);
  if (!city) notFound();

  const tagMap = buildMap(tags);
  const artistMap = buildMap(artists);
  const now = new Date().toISOString();
  const name = cityName(city.fields, locale);

  // Only venues in this city with at least one event
  const cityVenues = venues.filter(
    (v) => v.fields.city_id?.includes(city.id) && v.fields.event_list && v.fields.event_list.length > 0,
  );
  const venueIds = new Set(cityVenues.map((v) => v.id));

  // All events at city venues
  const cityEvents = events.filter((e) => e.fields.venue_id?.some((vid) => venueIds.has(vid)));
  const upcomingEvents = cityEvents
    .filter((e) => e.fields.start_at && e.fields.start_at >= now)
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));

  // Artists who have played in this city
  const eventIds = new Set(cityEvents.map((e) => e.id));
  const cityArtists = artists.filter((a) => a.fields.event_list?.some((eid) => eventIds.has(eid)));

  // Top artists by event frequency
  const topArtists = cityArtists
    .map((a) => ({
      artist: a,
      count: (a.fields.event_list || []).filter((eid) => eventIds.has(eid)).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((af) => af.artist);

  // Upcoming non-jam events (up to 10)
  const upcomingSlides = upcomingEvents
    .filter((e) => {
      const eventTags = resolveLinks(e.fields.tag_list, tagMap).map((t) => t.fields.name?.toLowerCase());
      return !eventTags.includes('jam session');
    })
    .slice(0, 10)
    .map((e) => ({
      date: formatDate(e.fields.start_at, locale, e.fields.timezone || city.fields.timezone || 'Asia/Taipei'),
      title: eventTitle(e.fields, locale),
      href: `/${locale}/events/${e.id}`,
    }));

  // Weekly jam sessions (next 30 days)
  const thirtyDaysLater = new Date(new Date(now).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const weeklyJams = upcomingEvents
    .filter((e) => {
      if (!e.fields.start_at || e.fields.start_at > thirtyDaysLater) return false;
      const eventTags = resolveLinks(e.fields.tag_list, tagMap).map((t) => t.fields.name?.toLowerCase());
      return eventTags.includes('jam session');
    })
    .slice(0, 6)
    .map((e) => ({
      date: formatDate(e.fields.start_at, locale, e.fields.timezone || city.fields.timezone || 'Asia/Taipei'),
      title: eventTitle(e.fields, locale),
      href: `/${locale}/events/${e.id}`,
    }));

  // Venue photos
  const venuePhotos = cityVenues
    .map((v) => ({
      url: photoUrl(v.fields.photo_url),
      name: displayName(v.fields),
    }))
    .filter((p): p is { url: string; name: string } => p.url !== null);

  // JSON-LD BreadcrumbList
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'JazzNode', item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: t('cities'), item: `${SITE_URL}/${locale}/cities` },
      { '@type': 'ListItem', position: 3, name },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="space-y-12">
        <FadeUp>
          <div>
            <nav className="text-xs text-[#8A8578] uppercase tracking-widest mb-4">
              <Link href={`/${locale}/cities`} className="hover:text-gold transition-colors duration-300">
                {t('cities')}
              </Link>
              <span className="mx-2">›</span>
              <span className="text-[var(--foreground)]">{name}</span>
            </nav>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold">{name}</h1>
            {city.fields.country_code && (
              <p className="text-[#8A8578] mt-2 text-sm uppercase tracking-widest">
                {city.fields.country_code}
              </p>
            )}
          </div>
        </FadeUp>

        {/* Stats row */}
        <FadeUp>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-[var(--muted-foreground)]">
            <span>
              <CountUp end={cityVenues.length} trigger="visible" className="font-bold text-gold text-lg" /> {t('venuesInCity')}
            </span>
            <span>
              <CountUp end={upcomingEvents.length} trigger="visible" className="font-bold text-gold text-lg" /> {t('eventsInCity')}
            </span>
            <span>
              <CountUp end={cityArtists.length} trigger="visible" className="font-bold text-gold text-lg" /> {t('artistsInCity')}
            </span>
          </div>
        </FadeUp>

        {/* Venues section */}
        <FadeUp>
          <section>
            <h2 className="font-serif text-2xl font-bold mb-4">{t('venuesInCity')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cityVenues.map((v) => {
                const photo = photoUrl(v.fields.photo_url);
                const venueName = displayName(v.fields);
                const eventCount = (v.fields.event_list || []).length;
                return (
                  <Link
                    key={v.id}
                    href={`/${locale}/venues/${v.id}`}
                    className="group bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 card-hover transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {photo ? (
                        <Image
                          src={photo}
                          alt={venueName}
                          width={48} height={48}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[var(--border)]"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center border-2 border-[var(--border)]">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
                            <circle cx="12" cy="9" r="2.5" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-serif font-bold truncate group-hover:text-gold transition-colors duration-300">
                          {venueName}
                        </p>
                        <p className="text-xs text-[#8A8578]">{eventCount} events</p>
                      </div>
                    </div>
                    {v.fields.address_local && (
                      <p className="text-xs text-[#8A8578] truncate">{v.fields.address_local}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        </FadeUp>

        {/* Weekly Jam Sessions */}
        {weeklyJams.length > 0 && (
          <FadeUp>
            <section>
              <h2 className="font-serif text-2xl font-bold mb-4">{t('weeklyJam')}</h2>
              <EventCarousel events={weeklyJams} label="" />
            </section>
          </FadeUp>
        )}

        {/* Upcoming events */}
        {upcomingSlides.length > 0 && (
          <FadeUp>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-2xl font-bold">{t('nextUpcoming')}</h2>
                <Link
                  href={`/${locale}/events?city=${city.id}`}
                  className="text-xs uppercase tracking-widest text-gold hover:text-[var(--color-gold-bright)] transition-colors duration-300"
                >
                  {t('exploreCityEvents')} →
                </Link>
              </div>
              <EventCarousel events={upcomingSlides} label="" />
            </section>
          </FadeUp>
        )}

        {/* Top performers */}
        {topArtists.length > 0 && (
          <FadeUp>
            <section>
              <h2 className="font-serif text-2xl font-bold mb-4">{t('topPerformers')}</h2>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {topArtists.map((a) => {
                  const photo = photoUrl(a.fields.photo_url);
                  const aName = artistDisplayName(a.fields, locale);
                  return (
                    <Link
                      key={a.id}
                      href={`/${locale}/artists/${a.id}`}
                      className="group flex items-center gap-3 bg-[var(--card)] rounded-xl border border-[var(--border)] p-3 card-hover transition-all duration-300"
                    >
                      {photo ? (
                        <Image
                          src={photo}
                          alt={aName}
                          width={40} height={40}
                          className="w-10 h-10 rounded-full object-cover border border-[var(--border)] shrink-0"
                          sizes="40px"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm shrink-0 border border-[var(--border)]">♪</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate group-hover:text-gold transition-colors duration-300">
                          {aName}
                        </p>
                        {a.fields.primary_instrument && (
                          <p className="text-[10px] text-[#8A8578] uppercase tracking-wider truncate">
                            {a.fields.primary_instrument}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </FadeUp>
        )}

        {/* Explore all events CTA */}
        <FadeUp>
          <div className="text-center py-6">
            <Link
              href={`/${locale}/events?city=${city.id}`}
              className="inline-block px-6 py-3 rounded-full border border-gold text-gold hover:bg-gold/10 transition-colors duration-300 text-sm uppercase tracking-widest"
            >
              {t('exploreCityEvents')} →
            </Link>
          </div>
        </FadeUp>
      </div>
    </>
  );
}
