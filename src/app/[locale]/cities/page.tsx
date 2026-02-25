export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getCities, getVenues, getEvents, getArtists } from '@/lib/airtable';
import { getThemeForCity, themes } from '@/lib/themes';
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

  const cityStats = cities.map((city) => {
    const cityVenues = venues.filter((v) => v.fields.city_id?.includes(city.id));
    const venueIds = new Set(cityVenues.map((v) => v.id));
    const cityEvents = events.filter((e) => e.fields.venue_id?.some((vid) => venueIds.has(vid)));
    const upcomingEvents = cityEvents.filter((e) => e.fields.start_at && e.fields.start_at >= now);
    const eventIds = new Set(cityEvents.map((e) => e.id));
    const cityArtists = artists.filter((a) => a.fields.event_list?.some((eid) => eventIds.has(eid)));

    return {
      city,
      venueCount: cityVenues.length,
      upcomingCount: upcomingEvents.length,
      artistCount: cityArtists.length,
      venues: cityVenues,
    };
  });

  cityStats.sort((a, b) => b.venueCount - a.venueCount || b.upcomingCount - a.upcomingCount);

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
            const theme = getThemeForCity(f.city_id);

            return (
              <div
                key={city.id}
                className="fade-up-item relative rounded-2xl border p-6 sm:p-8 overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  backgroundColor: theme.card,
                  borderColor: `rgba(${theme.glowRgb}, 0.12)`,
                  boxShadow: `inset 0 1px 0 rgba(${theme.glowRgb}, 0.08)`,
                }}
              >
                {/* Top gradient line */}
                <div
                  className="absolute inset-x-0 top-0 h-[2px]"
                  style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2}, transparent)` }}
                />

                {/* City name with dual-color accent */}
                <div className="mb-5">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: theme.text }}>
                    {name}
                  </h2>
                  <div className="mt-2 flex gap-1">
                    <div className="h-0.5 w-8 rounded-full" style={{ background: theme.accent }} />
                    <div className="h-0.5 w-4 rounded-full" style={{ background: theme.accent2 }} />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm mb-6" style={{ color: theme.muted }}>
                  <span>
                    <span className="font-bold" style={{ color: theme.accent }}>{venueCount}</span> {t('venuesInCity')}
                  </span>
                  <span>
                    <span className="font-bold" style={{ color: theme.accent2 }}>{upcomingCount}</span> {t('eventsInCity')}
                  </span>
                  <span>
                    <span className="font-bold" style={{ color: theme.accent }}>{artistCount}</span> {t('artistsInCity')}
                  </span>
                </div>

                {/* Venue chips — themed */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {cityVenues.map((v) => (
                    <Link
                      key={v.id}
                      href={`/${locale}/venues/${v.id}`}
                      className="text-xs px-3 py-1.5 rounded-full transition-colors duration-300"
                      style={{
                        background: `rgba(${theme.glowRgb}, 0.08)`,
                        border: `1px solid rgba(${theme.glowRgb}, 0.18)`,
                        color: theme.accent,
                      }}
                    >
                      {v.fields.display_name || v.fields.name_local || v.fields.name_en}
                    </Link>
                  ))}
                </div>

                {/* Action link */}
                <Link
                  href={`/${locale}/events?city=${encodeURIComponent(name)}`}
                  className="text-xs uppercase tracking-widest transition-colors duration-300 hover:text-[#F0EDE6]"
                  style={{ color: theme.accent }}
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
