'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';

interface SerializedVenue {
  id: string;
  displayName: string;
  photoUrl: string | null;
  cityRecordId: string | null;
  cityLabel: string;
  eventCount: number;
  jazzFrequency: string | null;
  description: string | null;
}

interface CityOption {
  recordId: string;
  label: string;
}

interface Props {
  venues: SerializedVenue[];
  cities: CityOption[];
  locale: string;
  labels: {
    venues: string;
    allCities: string;
    noVenues: string;
  };
}

export default function VenuesClient({ venues, cities, locale, labels }: Props) {
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());

  const toggleCity = useCallback((recordId: string) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  }, []);

  const filteredVenues = useMemo(() => {
    if (selectedCities.size === 0) return venues;
    return venues.filter((v) => v.cityRecordId && selectedCities.has(v.cityRecordId));
  }, [venues, selectedCities]);

  const filterKey = useMemo(() => {
    return [...selectedCities].sort().join(',');
  }, [selectedCities]);

  return (
    <div className="space-y-12">
      <FadeUp>
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold">{labels.venues}</h1>
          <p className="text-[#8A8578] mt-2 text-sm uppercase tracking-widest">
            {filteredVenues.length} venues
          </p>
        </div>
      </FadeUp>

      {/* City filter */}
      <div className="space-y-3">
        <FadeUpItem delay={100}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCities(new Set())}
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
              selectedCities.size === 0
                ? 'bg-gold/20 border-gold text-gold'
                : 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]'
            }`}
          >
            {labels.allCities}
          </button>
          {cities.map((city) => (
            <button
              key={city.recordId}
              onClick={() => toggleCity(city.recordId)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
                selectedCities.has(city.recordId)
                  ? 'bg-gold/20 border-gold text-gold'
                  : 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]'
              }`}
            >
              {city.label}
            </button>
          ))}
        </div>
        </FadeUpItem>
      </div>

      <div key={filterKey}>
        {filteredVenues.length === 0 && (
          <FadeUp>
            <p className="text-[#8A8578]">{labels.noVenues}</p>
          </FadeUp>
        )}

        <FadeUp stagger={0.15}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVenues.map((venue) => (
              <Link
                key={venue.id}
                href={`/${locale}/venues/${venue.id}`}
                className="fade-up-item block bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] card-hover group"
              >
                {venue.photoUrl && (
                  <div className="h-44 overflow-hidden mb-5 -mx-6 -mt-6 rounded-t-2xl">
                    <img
                      src={venue.photoUrl}
                      alt={venue.displayName}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <h3 className="font-serif text-xl font-bold group-hover:text-gold transition-colors duration-300">
                  {venue.displayName}
                </h3>
                <div className="flex gap-3 mt-2 text-xs uppercase tracking-widest text-[#8A8578]">
                  {venue.cityLabel && <span>📍 {venue.cityLabel}</span>}
                  <span>{venue.eventCount} events</span>
                  {venue.jazzFrequency && <span>🎵 {venue.jazzFrequency}</span>}
                </div>
                {venue.description && (
                  <p className="text-xs text-[#8A8578] mt-3 line-clamp-2 leading-relaxed">
                    {venue.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
