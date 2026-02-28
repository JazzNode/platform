'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';


interface SerializedEvent {
  id: string;
  title: string;
  start_at: string | null;
  timezone: string;
  venue_id: string | null;       // resolved venue record id
  venue_name: string;
  city_record_id: string | null; // venue's city linked record id
  primary_artist_name: string | null;
  sidemen: string[];
  description_short: string | null;
  date_display: string;
  time_display: string;
  tags: string[];
}

interface CityOption {
  recordId: string;
  citySlug: string;  // e.g. 'tw-tpe', 'hk-hkg'
  label: string;     // localized name
  countryCode: string; // e.g. 'TW', 'JP', 'HK'
}

interface VenueOption {
  recordId: string;
  label: string;  // display name
  cityRecordId: string | null;
}

interface Props {
  events: SerializedEvent[];
  cities: CityOption[];
  venues: VenueOption[];
  locale: string;
  showPast: boolean;
  regionLabels: Record<string, string>;  // e.g. { TW: '台灣', JP: '日本', HK: '香港' }
  worldMapLabel: string;                  // e.g. '世界版圖'
  labels: {
    allCities: string;
    allVenues: string;
    allCategories: string;
    jamSession: string;
    withVocal: string;
    matinee: string;
    events: string;
    pastEvents: string;
    upcomingCount: string;
    pastCount: string;
    noEvents: string;
    toggleLink: string;
  };
}

export default function EventsClient({ events, cities, venues, locale, showPast, regionLabels, worldMapLabel, labels }: Props) {
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set());

  // Group cities by country code
  const regionGroups = useMemo(() => {
    const map: Record<string, CityOption[]> = {};
    for (const c of cities) {
      const code = c.countryCode;
      if (!code) continue;
      if (!map[code]) map[code] = [];
      map[code].push(c);
    }
    return map;
  }, [cities]);

  // Stable region order
  const regionOrder = useMemo(() => Object.keys(regionGroups).sort(), [regionGroups]);

  // Derive selectedCities set for filtering (from region or single city)
  const selectedCities = useMemo(() => {
    if (selectedCity) return new Set([selectedCity]);
    if (activeRegion && regionGroups[activeRegion]) {
      return new Set(regionGroups[activeRegion].map((c) => c.recordId));
    }
    return new Set<string>();
  }, [selectedCity, activeRegion, regionGroups]);

  const handleRegionClick = useCallback((code: string) => {
    const citiesInRegion = regionGroups[code] || [];
    if (activeRegion === code) {
      // Click active region → deselect back to world map
      setActiveRegion(null);
      setSelectedCity(null);
      setSelectedVenues(new Set());
      return;
    }
    setActiveRegion(code);
    setSelectedVenues(new Set());
    // City-state (only 1 city): auto-select it
    if (citiesInRegion.length === 1) {
      setSelectedCity(citiesInRegion[0].recordId);
    } else {
      setSelectedCity(null);
    }
  }, [activeRegion, regionGroups]);

  const handleCityClick = useCallback((recordId: string) => {
    setSelectedCity((prev) => prev === recordId ? null : recordId);
    setSelectedVenues(new Set());
  }, []);

  const handleWorldMapClick = useCallback(() => {
    setActiveRegion(null);
    setSelectedCity(null);
    setSelectedVenues(new Set());
  }, []);

  const toggleVenue = useCallback((recordId: string) => {
    setSelectedVenues((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
    // Reverse sync: when selecting a venue, sync region + city
    const venue = venues.find((v) => v.recordId === recordId);
    if (venue?.cityRecordId) {
      const city = cities.find((c) => c.recordId === venue.cityRecordId);
      if (city) {
        setActiveRegion(city.countryCode || null);
        setSelectedCity(city.recordId);
      }
    }
  }, [venues, cities]);

  // Filter venues by selected cities
  const visibleVenues = useMemo(() => {
    if (selectedCities.size === 0) return venues;
    return venues.filter((v) => v.cityRecordId && selectedCities.has(v.cityRecordId));
  }, [venues, selectedCities]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Location filter
      if (selectedVenues.size > 0) {
        if (e.venue_id == null || !selectedVenues.has(e.venue_id)) return false;
      } else if (selectedCities.size > 0) {
        if (e.city_record_id == null || !selectedCities.has(e.city_record_id)) return false;
      }
      // Category filter
      if (selectedCategory === 'jam') {
        return e.tags.includes('jam session');
      }
      if (selectedCategory === 'vocal') {
        return e.tags.includes('vocals');
      }
      if (selectedCategory === 'matinee') {
        return e.tags.includes('matinee');
      }
      return true;
    });
  }, [events, selectedCities, selectedVenues, selectedCategory]);

  // Key for re-triggering animations on filter change
  const filterKey = useMemo(() => {
    return `${activeRegion}_${selectedCity}_${[...selectedVenues].sort().join(',')}_${selectedCategory}`;
  }, [activeRegion, selectedCity, selectedVenues, selectedCategory]);

  // Group by month
  const byMonth = useMemo(() => {
    const map = new Map<string, SerializedEvent[]>();
    for (const e of filteredEvents) {
      const d = e.start_at ? new Date(e.start_at) : null;
      const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [filteredEvents]);

  return (
    <div className="space-y-16">
      <FadeUp>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold">
              {showPast ? labels.pastEvents : labels.events}
            </h1>
            <p className="text-[#8A8578] mt-2 text-sm uppercase tracking-widest">
              {filteredEvents.length} {showPast ? labels.pastCount : labels.upcomingCount}
            </p>
          </div>
          <Link
            href={`/${locale}/events${showPast ? '' : '?view=past'}`}
            className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift"
          >
            {labels.toggleLink}
          </Link>
        </div>
      </FadeUp>

      {/* Filter Bar */}
      <div className="space-y-3">
        {/* Geographic hierarchy: World Map │ Region › Cities */}
        <FadeUpItem delay={100}>
        <div className="flex flex-wrap items-center gap-2">
          {/* World Map pill */}
          <button
            onClick={handleWorldMapClick}
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
              !activeRegion
                ? 'bg-gold/20 border-gold text-gold'
                : 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]'
            }`}
          >
            {worldMapLabel}
          </button>

          {/* Region pills */}
          {regionOrder.map((code) => {
            const isActive = activeRegion === code;
            const citiesInRegion = regionGroups[code] || [];
            const isSingleCity = citiesInRegion.length <= 1;

            // Hide non-active regions when a region is drilled into
            if (activeRegion && !isActive) return null;

            return (
              <span key={code} className="contents">
                {/* Separator */}
                {isActive && (
                  <span className="text-gold/40 text-xs select-none mx-0.5">│</span>
                )}

                {/* Region pill */}
                <button
                  onClick={() => handleRegionClick(code)}
                  className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
                    isActive
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]'
                  }`}
                >
                  {regionLabels[code] || code}
                </button>

                {/* City sub-pills (only when region is active and has multiple cities) */}
                {isActive && !isSingleCity && (
                  <>
                    <span className="text-gold/40 text-xs select-none mx-0.5">›</span>
                    {citiesInRegion.map((city, i) => (
                      <button
                        key={city.recordId}
                        onClick={() => handleCityClick(city.recordId)}
                        style={{ animation: `geo-pill-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s both` }}
                        className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
                          selectedCity === city.recordId
                            ? 'bg-gold/15 border-gold/70 text-gold'
                            : 'bg-transparent border-[rgba(240,237,230,0.08)] text-[#8A8578]/80 hover:border-[rgba(240,237,230,0.25)] hover:text-[#8A8578]'
                        }`}
                      >
                        {city.label}
                      </button>
                    ))}
                  </>
                )}
              </span>
            );
          })}
        </div>
        </FadeUpItem>

        {/* Venue pills — only show when there are venues to filter */}
        {visibleVenues.length > 1 && (
          <FadeUpItem delay={180}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedVenues(new Set())}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
                selectedVenues.size === 0
                  ? 'bg-gold/10 border-gold/60 text-gold'
                  : 'bg-transparent border-[var(--border)] text-[#6A6560] hover:border-[rgba(240,237,230,0.2)]'
              }`}
            >
              {labels.allVenues}
            </button>
            {visibleVenues.map((venue) => (
              <button
                key={venue.recordId}
                onClick={() => toggleVenue(venue.recordId)}
                className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
                  selectedVenues.has(venue.recordId)
                    ? 'bg-gold/10 border-gold/60 text-gold'
                    : 'bg-transparent border-[var(--border)] text-[#6A6560] hover:border-[rgba(240,237,230,0.2)]'
                }`}
              >
                {venue.label}
              </button>
            ))}
          </div>
          </FadeUpItem>
        )}

        {/* Category pills */}
        <FadeUpItem delay={260}>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all', label: labels.allCategories },
            { key: 'jam', label: labels.jamSession },
            { key: 'vocal', label: labels.withVocal },
            { key: 'matinee', label: labels.matinee },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
                selectedCategory === key
                  ? 'bg-gold/10 border-gold/60 text-gold'
                  : 'bg-transparent border-[var(--border)] text-[#6A6560] hover:border-[rgba(240,237,230,0.2)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        </FadeUpItem>
      </div>

      <div key={filterKey}>
        {filteredEvents.length === 0 && (
          <FadeUp>
            <p className="text-[#8A8578]">{labels.noEvents}</p>
          </FadeUp>
        )}

        {[...byMonth.entries()].map(([month, monthEvents]) => (
          <section key={month} className="mt-16 first:mt-0">
            <FadeUp>
              <h2 className="font-serif text-2xl font-bold mb-6 text-gold">{month}</h2>
            </FadeUp>
            <FadeUp stagger={0.12}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {monthEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/${locale}/events/${event.id}`}
                    className="fade-up-item block bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] card-hover group"
                  >
                    <div className="text-xs uppercase tracking-widest text-gold mb-2">
                      {event.tags.includes('matinee') && '☀️ '}{event.date_display} · {event.time_display}
                    </div>
                    <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
                      {event.title}
                    </h3>
                    <div className="text-xs text-[#8A8578] mt-2 space-y-0.5">
                      {event.description_short && (
                        <p className="line-clamp-2 italic">{event.description_short}</p>
                      )}
                      {event.venue_name && <p>↗ {event.venue_name}</p>}
                      {event.primary_artist_name && (
                        <p>♪ {event.primary_artist_name}</p>
                      )}
                      {event.sidemen.length > 0 && (
                        <p className="text-[#6A6560]">
                          w/ {event.sidemen.join(', ')}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </FadeUp>
          </section>
        ))}
      </div>
    </div>
  );
}
