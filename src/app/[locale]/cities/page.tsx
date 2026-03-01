export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getCities, getVenues, getEvents, getArtists } from '@/lib/airtable';
import { displayName, photoUrl, formatDate, cityName } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import CountUp from '@/components/animations/CountUp';
import EventCarousel from '@/components/EventCarousel';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('cities') };
}

export default async function CitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');

  const [cities, venues, events, artists] = await Promise.all([
    getCities(), getVenues(), getEvents(), getArtists(),
  ]);

  const now = new Date().toISOString();

  const cityStats = cities.map((city) => {
    const cityVenues = venues.filter((v) => v.fields.city_id?.includes(city.id));
    const venueIds = new Set(cityVenues.map((v) => v.id));
    const cityEvents = events.filter((e) => e.fields.venue_id?.some((vid) => venueIds.has(vid)));
    const upcomingEvents = cityEvents.filter((e) => e.fields.start_at && e.fields.start_at >= now);
    const eventIds = new Set(cityEvents.map((e) => e.id));
    const cityArtists = artists.filter((a) => a.fields.event_list?.some((eid) => eventIds.has(eid)));

    // Upcoming event slides (up to 5, pre-serialized for client carousel)
    const upcomingSlides = [...upcomingEvents]
      .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
      .slice(0, 5)
      .map((e) => ({
        date: formatDate(e.fields.start_at, locale, e.fields.timezone || city.fields.timezone || 'Asia/Taipei'),
        title: e.fields.title || e.fields.title_local || e.fields.title_en || 'Event',
      }));

    // Venue photos (up to 3)
    const venuePhotos = cityVenues
      .map((v) => ({
        url: photoUrl(v.fields.photo_url, v.fields.photo_file),
        name: v.fields.display_name || v.fields.name_local || v.fields.name_en || '',
      }))
      .filter((p): p is { url: string; name: string } => p.url !== null)
      .slice(0, 3);

    // Top artists by event frequency in this city
    const topArtists = cityArtists
      .map((a) => ({
        artist: a,
        count: (a.fields.event_list || []).filter((eid) => eventIds.has(eid)).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((af) => af.artist);

    return {
      city,
      venueCount: cityVenues.length,
      upcomingCount: upcomingEvents.length,
      artistCount: cityArtists.length,
      venues: cityVenues,
      upcomingSlides,
      venuePhotos,
      topArtists,
    };
  });

  // Preserve the order from getCities() (which has international priority)
  const cityOrder = new Map(cities.map((c, i) => [c.id, i]));
  cityStats.sort((a, b) => (cityOrder.get(a.city.id) ?? 0) - (cityOrder.get(b.city.id) ?? 0));

  return (
    <div className="space-y-12">
      <FadeUp>
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold">{t('cities')}</h1>
          <p className="text-[#8A8578] mt-2 text-sm uppercase tracking-widest">
            {cities.length} {t('citiesCount')}
          </p>
        </div>
      </FadeUp>

      <FadeUp stagger={0.15}>
        <div className="grid gap-6 sm:grid-cols-2">
          {cityStats.map(({ city, venueCount, upcomingCount, artistCount, venues: cityVenues, upcomingSlides, venuePhotos, topArtists }) => {
            const f = city.fields;
            const name = cityName(f, locale);

            return (
              <div
                key={city.id}
                className="fade-up-item relative bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 overflow-hidden group card-hover"
              >
                {/* Venue photo strip */}
                {venuePhotos.length > 0 && (
                  <div className="flex items-center -space-x-3 mb-5">
                    {venuePhotos.map((photo, i) => (
                      <img
                        key={i}
                        src={photo.url}
                        alt={photo.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[var(--card)]"
                        loading="lazy"
                        style={{ zIndex: venuePhotos.length - i }}
                      />
                    ))}
                    {cityVenues.length > venuePhotos.length && (
                      <span className="text-xs text-[#8A8578] ml-4">
                        +{cityVenues.length - venuePhotos.length}
                      </span>
                    )}
                  </div>
                )}

                {/* City name */}
                <div className="mb-5">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold">
                    {name}
                  </h2>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--muted-foreground)] mb-6">
                  <span>
                    <CountUp end={venueCount} trigger="visible" className="font-bold text-gold" /> {t('venuesInCity')}
                  </span>
                  <span>
                    <CountUp end={upcomingCount} trigger="visible" className="font-bold text-gold" /> {t('eventsInCity')}
                  </span>
                  <span>
                    <CountUp end={artistCount} trigger="visible" className="font-bold text-gold" /> {t('artistsInCity')}
                  </span>
                </div>

                {/* Venue chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {cityVenues.map((v) => (
                    <Link
                      key={v.id}
                      href={`/${locale}/venues/${v.id}`}
                      className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-gold hover:bg-gold/10 transition-colors duration-300"
                    >
                      {v.fields.display_name || v.fields.name_local || v.fields.name_en}
                    </Link>
                  ))}
                </div>

                {/* Top artist pills */}
                {topArtists.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[10px] uppercase tracking-widest text-[#8A8578] mb-2">
                      {t('topPerformers')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {topArtists.map((a) => (
                        <Link
                          key={a.id}
                          href={`/${locale}/artists/${a.id}`}
                          className="text-xs px-2.5 py-1 rounded-full bg-[var(--secondary)] text-[var(--foreground)] hover:text-gold hover:bg-gold/10 transition-colors duration-300"
                        >
                          {displayName(a.fields)}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming events carousel */}
                {upcomingSlides.length > 0 && (
                  <EventCarousel events={upcomingSlides} label={t('nextUpcoming')} />
                )}

                {/* Action link */}
                <Link
                  href={`/${locale}/events?city=${encodeURIComponent(name)}`}
                  className="text-xs uppercase tracking-widest text-gold hover:text-[var(--color-gold-bright)] transition-colors duration-300"
                >
                  {t('exploreCityEvents')} →
                </Link>
              </div>
            );
          })}
        </div>
      </FadeUp>
    </div>
  );
}
