export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getCities, getVenues, getEvents, getArtists } from '@/lib/airtable';
import FadeUp from '@/components/animations/FadeUp';


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

  // Build per-city stats
  const cityStats = cities.map((city) => {
    const cityVenues = venues.filter((v) => v.fields.city_id?.includes(city.id));
    const venueIds = new Set(cityVenues.map((v) => v.id));

    const cityEvents = events.filter((e) => e.fields.venue_id?.some((vid) => venueIds.has(vid)));
    const upcomingEvents = cityEvents.filter((e) => e.fields.start_at && e.fields.start_at >= now);

    // Unique artists who have played in this city (via lineup → event → venue)
    const eventIds = new Set(cityEvents.map((e) => e.id));
    const cityArtists = artists.filter((a) => a.fields.event_list?.some((eid) => eventIds.has(eid)));

    // Next upcoming event
    const nextEvent = upcomingEvents.sort((a, b) =>
      (a.fields.start_at || '').localeCompare(b.fields.start_at || ''),
    )[0];

    return {
      city,
      venueCount: cityVenues.length,
      eventCount: cityEvents.length,
      upcomingCount: upcomingEvents.length,
      artistCount: cityArtists.length,
      nextEvent,
      venues: cityVenues,
    };
  });

  // Sort: most venues first, then most events
  cityStats.sort((a, b) => b.venueCount - a.venueCount || b.eventCount - a.eventCount);

  const cityName = (fields: { name_local?: string; name_en?: string }, loc: string) =>
    loc === 'en' ? (fields.name_en || fields.name_local || '?') : (fields.name_local || fields.name_en || '?');

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
          {cityStats.map(({ city, venueCount, upcomingCount, artistCount, venues: cityVenues }) => {
            const f = city.fields;
            const name = cityName(f, locale);

            return (
              <div
                key={city.id}
                className="bg-[#111111] rounded-2xl border border-[rgba(240,237,230,0.06)] p-6 sm:p-8 group"
              >
                <div>
                  {/* City name */}
                  <div className="mb-4">
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold">{name}</h2>
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#8A8578] mb-6">
                    <span><span className="text-gold font-bold">{venueCount}</span> {t('venuesInCity')}</span>
                    <span><span className="text-gold font-bold">{upcomingCount}</span> {t('eventsInCity')}</span>
                    <span><span className="text-gold font-bold">{artistCount}</span> {t('artistsInCity')}</span>
                  </div>

                  {/* Venue chips */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {cityVenues.map((v) => (
                      <Link
                        key={v.id}
                        href={`/${locale}/venues/${v.id}`}
                        className="text-xs px-3 py-1.5 rounded-full bg-[rgba(200,168,78,0.08)] border border-[rgba(200,168,78,0.15)] text-[#C8A84E] hover:bg-[rgba(200,168,78,0.18)] transition-colors duration-300"
                      >
                        {v.fields.display_name || v.fields.name_local || v.fields.name_en}
                      </Link>
                    ))}
                  </div>

                  {/* Action links */}
                  <div className="flex gap-4">
                    <Link
                      href={`/${locale}/events?city=${encodeURIComponent(name)}`}
                      className="text-xs uppercase tracking-widest text-gold hover:text-[#F0EDE6] transition-colors duration-300"
                    >
                      {t('exploreCityEvents')} →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </FadeUp>
    </div>
  );
}
