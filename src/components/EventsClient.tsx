'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import FadeUp from '@/components/animations/FadeUp';

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
}

interface CityOption {
  recordId: string;
  label: string;  // localized name
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
  labels: {
    allCities: string;
    allVenues: string;
    events: string;
    pastEvents: string;
    upcomingCount: string;
    pastCount: string;
    noEvents: string;
    toggleLink: string;
  };
}

export default function EventsClient({ events, cities, venues, locale, showPast, labels }: Props) {
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set());

  const toggleCity = useCallback((recordId: string) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
    // Reset venue selection when city filter changes
    setSelectedVenues(new Set());
  }, []);

  const toggleVenue = useCallback((recordId: string) => {
    setSelectedVenues((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  }, []);

  // Filter venues by selected cities
  const visibleVenues = useMemo(() => {
    if (selectedCities.size === 0) return venues;
    return venues.filter((v) => v.cityRecordId && selectedCities.has(v.cityRecordId));
  }, [venues, selectedCities]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedVenues.size > 0) {
        return e.venue_id != null && selectedVenues.has(e.venue_id);
      }
      if (selectedCities.size > 0) {
        return e.city_record_id != null && selectedCities.has(e.city_record_id);
      }
      return true;
    });
  }, [events, selectedCities, selectedVenues]);

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
        {/* City pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setSelectedCities(new Set()); setSelectedVenues(new Set()); }}
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

        {/* Venue pills — only show when there are venues to filter */}
        {visibleVenues.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedVenues(new Set())}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
                selectedVenues.size === 0
                  ? 'bg-gold/10 border-gold/60 text-gold'
                  : 'bg-transparent border-[rgba(240,237,230,0.08)] text-[#6A6560] hover:border-[rgba(240,237,230,0.2)]'
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
                    : 'bg-transparent border-[rgba(240,237,230,0.08)] text-[#6A6560] hover:border-[rgba(240,237,230,0.2)]'
                }`}
              >
                {venue.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredEvents.length === 0 && (
        <p className="text-[#8A8578]">{labels.noEvents}</p>
      )}

      {[...byMonth.entries()].map(([month, monthEvents]) => (
        <section key={month}>
          <FadeUp>
            <h2 className="font-serif text-2xl font-bold mb-6 text-gold">{month}</h2>
          </FadeUp>
          <FadeUp stagger={0.12}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {monthEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/${locale}/events/${event.id}`}
                  className="fade-up-item block bg-[#111111] p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover group"
                >
                  <div className="text-xs uppercase tracking-widest text-gold mb-2">
                    {event.date_display} · {event.time_display}
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
  );
}
