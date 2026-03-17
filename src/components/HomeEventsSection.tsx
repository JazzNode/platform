'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import { useAuth } from './AuthProvider';

/** Mapping from user profile region → event country_code */
const REGION_TO_COUNTRY: Record<string, string> = {
  taiwan: 'TW',
  hong_kong: 'HK',
  singapore: 'SG',
  malaysia: 'MY',
  japan: 'JP',
  south_korea: 'KR',
  thailand: 'TH',
  indonesia: 'ID',
  philippines: 'PH',
};

interface HomeEvent {
  id: string;
  title: string;
  start_at: string | null;
  venue_name: string;
  city_name: string;
  country_code: string;
  date_display: string;
  time_display: string;
  sidemen: string[];
  tags: string[];
}

interface HomeVenue {
  id: string;
  name: string;
  city_name: string;
  country_code: string;
  event_count: number;
  jazz_frequency: string | null;
}

interface Labels {
  upcomingEvents: string;
  weeklyJam: string;
  featuredVenues: string;
  viewAll: string;
  noEvents: string;
  worldMap: string;
  jazzNightly: string;
  jazzWeekends: string;
  jazzOccasional: string;
}

interface Props {
  locale: string;
  events: HomeEvent[];
  jams: HomeEvent[];
  venues: HomeVenue[];
  regionLabels: Record<string, string>;
  regionOrder: string[];
  labels: Labels;
}

function EventCard({ event, locale, index }: { event: HomeEvent; locale: string; index: number }) {
  return (
    <FadeUpItem delay={(index % 3) * 60} className={index >= 6 ? 'hidden sm:block' : undefined}>
      <Link href={`/${locale}/events/${event.id}`} className="block bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] card-hover group h-full">
        {event.venue_name && (
          <p className="text-[10px] uppercase tracking-widest text-[#8A8578] mb-1">
            {event.city_name ? `${event.city_name} · ` : ''}{event.venue_name}
          </p>
        )}
        <div className="text-xs uppercase tracking-widest text-gold mb-2">
          {event.tags.includes('matinee') && '☀️ '}{event.date_display} · {event.time_display}
        </div>
        <h3 className="font-serif text-lg font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
          {event.title}
        </h3>
        {event.sidemen.length > 0 && (
          <p className="text-xs text-[#6A6560] mt-2">w/ {event.sidemen.join(', ')}</p>
        )}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {event.tags.map((tag) => (
              <span key={tag} className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold/8 text-gold/70 border border-gold/15">
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </FadeUpItem>
  );
}

export default function HomeEventsSection({
  locale, events, jams, venues, regionLabels, regionOrder, labels,
}: Props) {
  const { profile } = useAuth();

  const defaultRegion = useMemo(() => {
    if (!profile?.region) return null;
    return REGION_TO_COUNTRY[profile.region] || null;
  }, [profile?.region]);

  const [activeRegion, setActiveRegion] = useState<string | null>(defaultRegion);

  const filteredEvents = useMemo(() => {
    if (!activeRegion) return events;
    return events.filter((e) => e.country_code === activeRegion);
  }, [events, activeRegion]);

  const filteredJams = useMemo(() => {
    if (!activeRegion) return jams;
    return jams.filter((e) => e.country_code === activeRegion);
  }, [jams, activeRegion]);

  const filteredVenues = useMemo(() => {
    if (!activeRegion) return venues;
    return venues.filter((v) => v.country_code === activeRegion);
  }, [venues, activeRegion]);

  const jazzFreqLabel: Record<string, string> = {
    nightly: labels.jazzNightly,
    weekends: labels.jazzWeekends,
    occasional: labels.jazzOccasional,
  };

  const pillBase = 'px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 border font-serif font-light cursor-pointer';
  const pillActive = 'bg-gold/20 border-gold text-gold';
  const pillInactive = 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]';

  return (
    <div className="space-y-24">
      {/* ─── Global Region Filter ─── */}
      <FadeUp>
        <div className="relative py-6">
          {/* Subtle glow backdrop */}
          <div
            className="absolute inset-0 -mx-4 sm:-mx-8 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(200,170,110,0.04) 0%, transparent 50%, rgba(200,170,110,0.02) 100%)',
              border: '1px solid rgba(200,170,110,0.08)',
            }}
          />
          <div className="relative flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveRegion(null)}
              className={`${pillBase} ${!activeRegion ? pillActive : pillInactive}`}
            >
              {labels.worldMap}
            </button>
            <span className="text-gold/20 text-xs select-none mx-0.5">│</span>
            {regionOrder.map((code) => (
              <button
                key={code}
                onClick={() => setActiveRegion(activeRegion === code ? null : code)}
                className={`${pillBase} ${activeRegion === code ? pillActive : pillInactive}`}
              >
                {regionLabels[code] || code}
              </button>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* ─── Upcoming Events ─── */}
      <section>
        <FadeUp>
          <div className="flex items-end justify-between mb-12 border-b border-[var(--border)] pb-6">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold">{labels.upcomingEvents}</h2>
            <Link href={`/${locale}/events`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift">
              {labels.viewAll} →
            </Link>
          </div>
        </FadeUp>
        {filteredEvents.length === 0 ? (
          <p className="text-[#8A8578]">{labels.noEvents}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.slice(0, 9).map((event, i) => (
              <EventCard key={event.id} event={event} locale={locale} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Weekly Open Jam ─── */}
      {filteredJams.length > 0 && (
        <section>
          <FadeUp>
            <div className="flex items-end justify-between mb-12 border-b border-[var(--border)] pb-6">
              <h2 className="font-serif text-4xl sm:text-5xl font-bold">{labels.weeklyJam}</h2>
              <Link href={`/${locale}/events?category=jam`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift">
                {labels.viewAll} →
              </Link>
            </div>
          </FadeUp>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJams.map((event, i) => (
              <EventCard key={event.id} event={event} locale={locale} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Featured Venues ─── */}
      {filteredVenues.length > 0 && (
        <section>
          <FadeUp>
            <div className="flex items-end justify-between mb-12 border-b border-[var(--border)] pb-6">
              <h2 className="font-serif text-4xl sm:text-5xl font-bold">{labels.featuredVenues}</h2>
              <Link href={`/${locale}/venues`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift">
                {labels.viewAll} →
              </Link>
            </div>
          </FadeUp>
          <FadeUp stagger={0.15}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVenues.slice(0, 6).map((venue) => (
                <Link key={venue.id} href={`/${locale}/venues/${venue.id}`} className="fade-up-item block bg-[var(--card)] p-6 card-hover group border border-[var(--border)]">
                  <h3 className="font-serif text-xl font-bold group-hover:text-gold transition-colors duration-300">
                    {venue.name}
                  </h3>
                  <p className="mt-2 text-xs uppercase tracking-widest text-[#8A8578]">
                    {venue.city_name} · {venue.event_count} events
                  </p>
                  {venue.jazz_frequency && (
                    <p className="mt-1 text-xs text-[#6A6560]">{jazzFreqLabel[venue.jazz_frequency] || venue.jazz_frequency}</p>
                  )}
                </Link>
              ))}
            </div>
          </FadeUp>
        </section>
      )}
    </div>
  );
}
