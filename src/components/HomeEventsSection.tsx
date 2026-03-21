'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import BookmarkButton from '@/components/BookmarkButton';
import AddToCalendar from '@/components/AddToCalendar';
import ShareButton from '@/components/ShareButton';
import FollowButton from '@/components/FollowButton';
import { useFollows } from '@/components/FollowsProvider';
import { useRegion } from './RegionProvider';

interface HomeEvent {
  id: string;
  title: string;
  start_at: string | null;
  end_at?: string | null;
  timezone: string;
  venue_name: string;
  venue_address?: string;
  city_name: string;
  country_code: string;
  relative_label: string;
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
  jazzNightly: string;
  jazzWeekends: string;
  jazzOccasional: string;
}

interface Props {
  locale: string;
  events: HomeEvent[];
  jams: HomeEvent[];
  venues: HomeVenue[];
  labels: Labels;
}

function EventCard({ event, locale, index }: { event: HomeEvent; locale: string; index: number }) {
  const { isFollowing } = useFollows();
  const bookmarked = isFollowing('event', event.id);

  return (
    <FadeUpItem delay={(index % 3) * 60} className={index >= 6 ? 'hidden sm:block' : undefined}>
      <Link
        href={`/${locale}/events/${event.id}`}
        className="block relative p-6 rounded-2xl border card-hover group h-full"
        style={{
          backgroundColor: bookmarked ? 'rgba(var(--theme-glow-rgb), 0.14)' : 'var(--card)',
          borderColor: bookmarked ? 'rgba(var(--theme-glow-rgb), 0.22)' : 'var(--border)',
          transition: 'background-color 0.6s ease, border-color 0.6s ease, box-shadow 0.4s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        <div className="absolute top-3 right-3 z-10 flex items-center gap-0" onClick={(e) => e.preventDefault()}>
          <AddToCalendar
            title={event.title}
            startAt={event.start_at || ''}
            endAt={event.end_at}
            timezone={event.timezone}
            venueName={event.venue_name}
            address={event.venue_address}
            variant="icon"
          />
          <ShareButton
            title={event.title}
            url={`/${locale}/events/${event.id}`}
            variant="icon"
          />
          <BookmarkButton itemId={event.id} />
        </div>
        {event.venue_name && (
          <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1">
            {event.city_name ? `${event.city_name} · ` : ''}{event.venue_name}
          </p>
        )}
        <div className="text-xs uppercase tracking-widest text-gold mb-2">
          {event.tags.includes('matinee') && '☀️ '}{event.relative_label} · {event.time_display}
        </div>
        <h3 className="font-serif text-lg font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
          {event.title}
        </h3>
        {event.sidemen.length > 0 && (
          <p className="text-xs text-[var(--muted-foreground)] mt-2">w/ {event.sidemen.join(', ')}</p>
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
  locale, events, jams, venues, labels,
}: Props) {
  const { region } = useRegion();
  const { isFollowing } = useFollows();

  // Fall back to world map (null) when the selected region has no content
  // on this page — mirrors the visual logic in RegionExploreRow
  const availableCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const e of events) if (e.country_code) codes.add(e.country_code);
    for (const e of jams) if (e.country_code) codes.add(e.country_code);
    for (const v of venues) if (v.country_code) codes.add(v.country_code);
    return codes;
  }, [events, jams, venues]);

  const effectiveRegion = region && availableCodes.has(region) ? region : null;

  const filteredEvents = useMemo(() => {
    if (!effectiveRegion) return events;
    return events.filter((e) => e.country_code === effectiveRegion);
  }, [events, effectiveRegion]);

  const filteredJams = useMemo(() => {
    if (!effectiveRegion) return jams;
    return jams.filter((e) => e.country_code === effectiveRegion);
  }, [jams, effectiveRegion]);

  const filteredVenues = useMemo(() => {
    if (!effectiveRegion) return venues;
    return venues.filter((v) => v.country_code === effectiveRegion);
  }, [venues, effectiveRegion]);

  const jazzFreqLabel: Record<string, string> = {
    nightly: labels.jazzNightly,
    weekends: labels.jazzWeekends,
    occasional: labels.jazzOccasional,
  };

  return (
    <div className="space-y-24">
      {/* ─── Upcoming Events ─── */}
      <section>
        <FadeUp>
          <div className="flex items-end justify-between mb-12 border-b border-[var(--border)] pb-6">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold">{labels.upcomingEvents}</h2>
            <Link href={`/${locale}/events`} className="text-sm uppercase tracking-widest text-gold hover:text-gold-bright transition-colors link-lift">
              {labels.viewAll} →
            </Link>
          </div>
        </FadeUp>
        {filteredEvents.length === 0 ? (
          <p className="text-[var(--muted-foreground)]">{labels.noEvents}</p>
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
              <h2 className="font-serif text-4xl sm:text-5xl font-bold whitespace-pre-line sm:whitespace-normal">{labels.weeklyJam}</h2>
              <Link href={`/${locale}/events?category=jam`} className="text-sm uppercase tracking-widest text-gold hover:text-gold-bright transition-colors link-lift">
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
              <Link href={`/${locale}/venues`} className="text-sm uppercase tracking-widest text-gold hover:text-gold-bright transition-colors link-lift">
                {labels.viewAll} →
              </Link>
            </div>
          </FadeUp>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVenues.slice(0, 6).map((venue, i) => {
                const followed = isFollowing('venue', venue.id);
                return (
                  <FadeUpItem key={venue.id} delay={(i % 3) * 60}>
                  <Link
                    href={`/${locale}/venues/${venue.id}`}
                    className="block relative p-6 rounded-2xl border card-hover group h-full"
                    style={{
                      backgroundColor: followed ? 'rgba(var(--theme-glow-rgb), 0.14)' : 'var(--card)',
                      borderColor: followed ? 'rgba(var(--theme-glow-rgb), 0.22)' : 'var(--border)',
                      transition: 'background-color 0.6s ease, border-color 0.6s ease, box-shadow 0.4s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
                    }}
                  >
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-0" onClick={(e) => e.preventDefault()}>
                      <ShareButton
                        title={venue.name}
                        url={`/${locale}/venues/${venue.id}`}
                        variant="icon"
                      />
                      <FollowButton itemType="venue" itemId={venue.id} />
                    </div>
                    <h3 className="font-serif text-xl font-bold group-hover:text-gold transition-colors duration-300">
                      {venue.name}
                    </h3>
                    <p className="mt-2 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
                      {venue.city_name} · {venue.event_count} events
                    </p>
                    {venue.jazz_frequency && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{jazzFreqLabel[venue.jazz_frequency] || venue.jazz_frequency}</p>
                    )}
                  </Link>
                  </FadeUpItem>
                );
              })}
            </div>
        </section>
      )}
    </div>
  );
}
