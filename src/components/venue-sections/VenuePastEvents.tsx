import Link from 'next/link';
import type { Event as VenueEvent, Artist } from '@/lib/supabase';
import { eventTitle, formatDate, artistDisplayName } from '@/lib/helpers';
import CollapsibleSection from '@/components/CollapsibleSection';

interface VenuePastEventsProps {
  events: { id: string; fields: VenueEvent }[];
  artists: { id: string; fields: Artist }[];
  locale: string;
  t: (key: string) => string;
  resolveLinks: (ids: string[] | undefined, collection: { id: string; fields: Artist }[]) => { id: string; fields: Artist }[];
}

export default function VenuePastEvents({
  events,
  artists,
  locale,
  t,
  resolveLinks,
}: VenuePastEventsProps) {
  if (events.length === 0) return null;

  return (
    <section>
      <CollapsibleSection
        title={t('pastHighlights')}
        count={events.length}
        countLabel={t('gigsCount')}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 12).map((event) => {
            const ef = event.fields;
            const tz = (ef.timezone) || 'Asia/Taipei';
            const artist = resolveLinks(ef.primary_artist, artists)[0];
            return (
              <Link
                key={event.id}
                href={`/${locale}/events/${event.id}`}
                className="block p-4 rounded-xl border border-[var(--border)] hover:border-[var(--color-gold)]/20 transition-colors group"
              >
                <div className="text-xs text-[var(--muted-foreground)] mb-1">
                  {formatDate(ef.start_at, locale, tz)}
                </div>
                <h3 className="text-sm font-medium group-hover:text-gold transition-colors duration-300 line-clamp-1">
                  {eventTitle(ef, locale)}
                </h3>
                {artist && (
                  <p className="text-xs text-[var(--muted-foreground)]/60 mt-0.5">
                    ♪ {artistDisplayName(artist.fields, locale)}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </CollapsibleSection>
    </section>
  );
}
