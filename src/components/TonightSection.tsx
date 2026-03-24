'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import BookmarkButton from '@/components/BookmarkButton';
import AddToCalendar from '@/components/AddToCalendar';
import ShareButton from '@/components/ShareButton';
import { useFollows } from '@/components/FollowsProvider';
import { useRegion } from '@/components/RegionProvider';

export interface TonightEvent {
  id: string;
  title: string;
  start_at: string | null;
  end_at?: string | null;
  timezone: string;
  venue_name: string;
  venue_address?: string;
  city_name: string;
  country_code: string;
  relative_label: string; // "Tonight" / "今晚"
  time_display: string;
  sidemen: string[];
  tags: string[];
  source_url?: string | null;
  is_live: boolean;
}

interface Labels {
  tonightEvents: string;
  tonightEmpty: string;
  thisWeek: string;
  viewAll: string;
  live: string;
  addToCalendar: string;
  share: string;
}

interface Props {
  locale: string;
  tonightEvents: TonightEvent[];
  thisWeekEvents: TonightEvent[];
  labels: Labels;
}

function TonightCard({ event, locale, index }: { event: TonightEvent; locale: string; index: number }) {
  const { isFollowing } = useFollows();
  const bookmarked = isFollowing('event', event.id);

  return (
    <FadeUpItem delay={(index % 3) * 60}>
      <Link
        href={`/${locale}/events/${event.id}`}
        className="block relative p-6 rounded-2xl border card-hover group h-full"
        style={{
          backgroundColor: event.is_live
            ? 'rgba(var(--theme-glow-rgb), 0.18)'
            : bookmarked
              ? 'rgba(var(--theme-glow-rgb), 0.14)'
              : 'var(--card)',
          borderColor: event.is_live
            ? 'rgba(var(--theme-glow-rgb), 0.35)'
            : bookmarked
              ? 'rgba(var(--theme-glow-rgb), 0.22)'
              : 'var(--border)',
          transition: 'background-color 0.6s ease, border-color 0.6s ease, box-shadow 0.4s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        {/* Actions — absolute top-right, matching EventCard */}
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
            text={[
              event.title,
              `📅 ${event.relative_label} · ${event.time_display}${event.venue_name ? ` · 📍 ${event.venue_name}` : ''}`,
              'via JazzNode — The Jazz Scene, Connected.',
            ].filter(Boolean).join('\n')}
            variant="icon"
          />
          <BookmarkButton itemId={event.id} />
        </div>

        {/* LIVE badge + Venue */}
        <div className="flex items-center gap-2 mb-1">
          {event.is_live && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              LIVE
            </span>
          )}
          {event.venue_name && (
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
              {event.city_name ? `${event.city_name} · ` : ''}{event.venue_name}
            </p>
          )}
        </div>

        {/* Time */}
        <div className="text-xs uppercase tracking-widest text-gold mb-2">
          {event.tags.includes('matinee') && '☀️ '}
          {event.relative_label} · {event.time_display}
        </div>

        {/* Title */}
        <h3 className="font-serif text-lg font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
          {event.title}
        </h3>

        {/* Sidemen */}
        {event.sidemen.length > 0 && (
          <p className="text-xs text-[var(--muted-foreground)] mt-2">
            w/ {event.sidemen.join(', ')}
          </p>
        )}

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold/8 text-gold/70 border border-gold/15"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </FadeUpItem>
  );
}

export default function TonightSection({ locale, tonightEvents, thisWeekEvents, labels }: Props) {
  const { region } = useRegion();

  const filteredTonight = useMemo(() => {
    if (!region) return tonightEvents;
    return tonightEvents.filter((e) => e.country_code === region);
  }, [tonightEvents, region]);

  const filteredThisWeek = useMemo(() => {
    if (!region) return thisWeekEvents;
    return thisWeekEvents.filter((e) => e.country_code === region);
  }, [thisWeekEvents, region]);

  // Show tonight if we have events, otherwise fall back to this week
  const showTonight = filteredTonight.length > 0;
  const eventsToShow = showTonight ? filteredTonight : filteredThisWeek.slice(0, 6);
  const sectionTitle = showTonight ? labels.tonightEvents : labels.thisWeek;

  return (
    <section>
      <FadeUp>
        <div className="flex items-end justify-between mb-8 sm:mb-12">
          <h2 className="font-serif text-4xl sm:text-5xl font-bold whitespace-pre-line sm:whitespace-normal">
            {sectionTitle}
          </h2>
          <Link
            href={`/${locale}/events`}
            className="text-sm uppercase tracking-widest text-gold hover:text-gold-bright transition-colors link-lift"
          >
            {labels.viewAll} →
          </Link>
        </div>
      </FadeUp>

      {eventsToShow.length === 0 ? (
        <FadeUp>
          <div className="text-center py-12 rounded-2xl border border-dashed border-[var(--border)]">
            <p className="text-[var(--muted-foreground)]">{labels.tonightEmpty}</p>
            <Link
              href={`/${locale}/events`}
              className="inline-block mt-4 text-sm text-gold hover:text-gold-bright transition-colors"
            >
              {labels.viewAll} →
            </Link>
          </div>
        </FadeUp>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventsToShow.map((event, i) => (
            <TonightCard key={event.id} event={event} locale={locale} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
