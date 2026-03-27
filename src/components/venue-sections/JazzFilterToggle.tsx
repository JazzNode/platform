'use client';

import { useState } from 'react';
import type { Event as VenueEvent, Artist } from '@/lib/supabase';
import VenueUpcomingEvents from './VenueUpcomingEvents';
import VenuePastEvents from './VenuePastEvents';
import VenueFeaturedEvent from './VenueFeaturedEvent';

interface JazzFilterToggleProps {
  /** All events (unfiltered) at this venue, sorted by start_at desc */
  allEvents: { id: string; fields: VenueEvent }[];
  /** Jazz-only events (confirmed + likely) */
  jazzEvents: { id: string; fields: VenueEvent }[];
  artists: { id: string; fields: Artist }[];
  venueId: string;
  locale: string;
  t: (key: string) => string;
  resolveLinks: (ids: string[] | undefined, collection: { id: string; fields: Artist }[]) => { id: string; fields: Artist }[];
  /** Which section: 'upcoming' | 'past' */
  section: 'upcoming' | 'past';
  sectionTitle?: string;
}

export default function JazzFilterToggle({
  allEvents,
  jazzEvents,
  artists,
  venueId,
  locale,
  t,
  resolveLinks,
  section,
  sectionTitle,
}: JazzFilterToggleProps) {
  const [jazzOnly, setJazzOnly] = useState(true);
  const events = jazzOnly ? jazzEvents : allEvents;
  const hiddenCount = allEvents.length - jazzEvents.length;

  if (allEvents.length === 0) return null;

  return (
    <div>
      {/* Toggle — only show if there are hidden non-jazz events */}
      {hiddenCount > 0 && (
        <div className="flex items-center justify-end mb-4 gap-2">
          <label className="relative inline-flex items-center cursor-pointer gap-2 text-xs text-[var(--muted-foreground)]">
            <span>{t('jazzOnlyFilter')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={jazzOnly}
              onClick={() => setJazzOnly(!jazzOnly)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                jazzOnly
                  ? 'bg-gold border-gold'
                  : 'bg-[var(--muted)] border-[var(--border)]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
                  jazzOnly ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        </div>
      )}

      {section === 'upcoming' && (
        <VenueUpcomingEvents
          events={events}
          artists={artists}
          venueId={venueId}
          locale={locale}
          t={t}
          resolveLinks={resolveLinks}
          sectionTitle={sectionTitle}
        />
      )}

      {section === 'past' && (
        <VenuePastEvents
          events={events}
          artists={artists}
          locale={locale}
          t={t}
          resolveLinks={resolveLinks}
        />
      )}
    </div>
  );
}
