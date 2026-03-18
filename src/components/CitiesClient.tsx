'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRegion } from '@/components/RegionProvider';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import CountUp from '@/components/animations/CountUp';
import EventCarousel from '@/components/EventCarousel';

interface VenueSlim {
  id: string;
  displayName: string;
  photoUrl: string | null;
}

interface EventSlide {
  date: string;
  title: string;
  href: string;
}

interface ArtistSlim {
  id: string;
  displayName: string;
}

interface CityCard {
  id: string;
  name: string;
  countryCode: string;
  venueCount: number;
  upcomingCount: number;
  artistCount: number;
  venues: VenueSlim[];
  venuePhotos: { url: string; name: string }[];
  topArtists: ArtistSlim[];
  upcomingSlides: EventSlide[];
  weeklyJams: EventSlide[];
}

interface Props {
  cities: CityCard[];
  locale: string;
  regionLabels: Record<string, string>;
  worldMapLabel: string;
  labels: {
    cities: string;
    citiesCount: string;
    venuesInCity: string;
    eventsInCity: string;
    artistsInCity: string;
    topPerformers: string;
    weeklyJam: string;
    nextUpcoming: string;
    exploreCityEvents: string;
  };
}

const pillHitArea = 'relative after:absolute after:inset-x-0 after:inset-y-[-6px] after:content-[\'\'] after:min-h-[44px] after:top-1/2 after:-translate-y-1/2';

export default function CitiesClient({ cities, locale, regionLabels, worldMapLabel, labels }: Props) {
  const { region: globalRegion } = useRegion();
  const hasInteracted = useRef(false);

  // Local region state that syncs with global
  const [activeRegion, setActiveRegionState] = useState<string | null>(null);

  const setActiveRegion = useCallback((code: string | null) => {
    hasInteracted.current = true;
    setActiveRegionState(code);
  }, []);

  // Derive region order from available cities
  const regionOrder = useMemo(() => {
    const codes = [...new Set(cities.map((c) => c.countryCode).filter(Boolean))];
    return codes.sort();
  }, [cities]);

  // Sync with global region — fall back to null if globalRegion has no content on this page
  useEffect(() => {
    if (!hasInteracted.current) {
      setActiveRegionState(globalRegion && regionOrder.includes(globalRegion) ? globalRegion : null);
    }
  }, [globalRegion, regionOrder]);

  // Filter cities by active region
  const filteredCities = useMemo(() => {
    if (!activeRegion) return cities;
    return cities.filter((c) => c.countryCode === activeRegion);
  }, [cities, activeRegion]);

  // Key for re-triggering card animations on filter change
  const filterKey = useMemo(() => `cities_${activeRegion || 'world'}`, [activeRegion]);

  return (
    <div className="space-y-12">
      <FadeUp>
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold">{labels.cities}</h1>
          <p className="text-[#8A8578] mt-2 text-sm uppercase tracking-widest">
            {filteredCities.length} {labels.citiesCount}
          </p>
        </div>
      </FadeUp>

      {/* Region filter */}
      {regionOrder.length > 1 && (
        <FadeUpItem delay={100}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
          <button
            onClick={() => setActiveRegion(null)}
            className={`${pillHitArea} px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 border font-serif font-light ${
              !activeRegion
                ? 'bg-gold/20 border-gold text-gold'
                : 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]'
            }`}
          >
            {worldMapLabel}
          </button>
          {regionOrder.map((code, i) => (
            <button
              key={code}
              onClick={() => setActiveRegion(activeRegion === code ? null : code)}
              style={{ animation: `geo-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.04}s both` }}
              className={`${pillHitArea} px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 border font-serif font-light ${
                activeRegion === code
                  ? 'bg-gold/20 border-gold text-gold'
                  : 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]'
              }`}
            >
              {regionLabels[code] || code}
            </button>
          ))}
        </div>
        </FadeUpItem>
      )}

      <div key={filterKey} className="grid gap-6 sm:grid-cols-2">
          {filteredCities.map((city, i) => (
            <FadeUpItem key={city.id} delay={(i % 2) * 60}>
            <div
              className="relative bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 sm:p-8 overflow-hidden group card-hover"
            >
              {/* Venue photo strip */}
              {city.venuePhotos.length > 0 && (
                <div className="flex items-center -space-x-3 mb-5">
                  {city.venuePhotos.map((photo, i) => (
                    <Image
                      key={i}
                      src={photo.url}
                      alt={photo.name}
                      width={40} height={40}
                      className="w-10 h-10 rounded-full object-cover border-2 border-[var(--card)]"
                      style={{ zIndex: city.venuePhotos.length - i }}
                      sizes="40px"
                    />
                  ))}
                  {city.venues.length > city.venuePhotos.length && (
                    <span className="text-xs text-[#8A8578] ml-4">
                      +{city.venues.length - city.venuePhotos.length}
                    </span>
                  )}
                </div>
              )}

              {/* City name */}
              <div className="mb-5">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold">
                  {city.name}
                </h2>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--muted-foreground)] mb-6">
                <span>
                  <CountUp end={city.venueCount} trigger="visible" className="font-bold text-gold" /> {labels.venuesInCity}
                </span>
                <span>
                  <CountUp end={city.upcomingCount} trigger="visible" className="font-bold text-gold" /> {labels.eventsInCity}
                </span>
                <span>
                  <CountUp end={city.artistCount} trigger="visible" className="font-bold text-gold" /> {labels.artistsInCity}
                </span>
              </div>

              {/* Venue chips */}
              <div className="flex flex-wrap gap-2 mb-6">
                {city.venues.map((v) => (
                  <Link
                    key={v.id}
                    href={`/${locale}/venues/${v.id}`}
                    className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-gold hover:bg-gold/10 transition-colors duration-300"
                  >
                    {v.displayName}
                  </Link>
                ))}
              </div>

              {/* Top artist pills */}
              {city.topArtists.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] uppercase tracking-widest text-[#8A8578] mb-2">
                    {labels.topPerformers}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {city.topArtists.map((a) => (
                      <Link
                        key={a.id}
                        href={`/${locale}/artists/${a.id}`}
                        className="text-xs px-2.5 py-1 rounded-full bg-[var(--secondary)] text-[var(--foreground)] hover:text-gold hover:bg-gold/10 transition-colors duration-300"
                      >
                        {a.displayName}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly Open Jam */}
              {city.weeklyJams.length > 0 && (
                <EventCarousel events={city.weeklyJams} label={labels.weeklyJam} />
              )}

              {/* Upcoming events carousel */}
              {city.upcomingSlides.length > 0 && (
                <EventCarousel events={city.upcomingSlides} label={labels.nextUpcoming} />
              )}

              {/* Action link */}
              <Link
                href={`/${locale}/cities/${city.id}`}
                className="text-xs uppercase tracking-widest text-gold hover:text-[var(--color-gold-bright)] transition-colors duration-300"
              >
                {labels.exploreCityEvents} →
              </Link>
            </div>
            </FadeUpItem>
          ))}
      </div>
    </div>
  );
}
