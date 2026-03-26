import Image from 'next/image';
import Link from 'next/link';
import type { Event as VenueEvent, Artist } from '@/lib/supabase';
import { eventTitle, formatDate, formatTime, artistDisplayName } from '@/lib/helpers';

interface VenueUpcomingEventsProps {
  events: { id: string; fields: VenueEvent }[];
  artists: { id: string; fields: Artist }[];
  venueId: string;
  locale: string;
  t: (key: string) => string;
  resolveLinks: (ids: string[] | undefined, collection: { id: string; fields: Artist }[]) => { id: string; fields: Artist }[];
  /** Override the section title (e.g. for "Today's Jazz") */
  sectionTitle?: string;
}

export default function VenueUpcomingEvents({
  events,
  artists,
  venueId,
  locale,
  t,
  resolveLinks,
  sectionTitle,
}: VenueUpcomingEventsProps) {
  if (events.length === 0) return null;

  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <h2 className="font-serif text-xl sm:text-2xl font-bold">
          {sectionTitle || t('upcomingGigs')}
        </h2>
        <Link
          href={`/${locale}/events?venue=${venueId}`}
          className="text-xs uppercase tracking-widest text-gold hover:text-gold-bright transition-colors link-lift"
        >
          {t('viewAll')} →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
        {events.slice(0, 6).map((event) => {
          const ef = event.fields;
          const tz = ef.timezone || 'Asia/Taipei';
          const artist = resolveLinks(ef.primary_artist, artists)[0];
          const poster = ef.poster_url;

          return (
            <Link
              key={event.id}
              href={`/${locale}/events/${event.id}`}
              className="block shrink-0 w-[260px] sm:w-auto bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden card-hover group"
            >
              <div className="relative h-[160px] sm:h-[180px] overflow-hidden">
                {poster ? (
                  <Image
                    src={poster}
                    alt={eventTitle(ef, locale)}
                    fill
                    className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 260px"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent flex items-center justify-center">
                    <svg className="w-10 h-10 text-gold/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                )}
                {ef.start_at && (
                  <div className="absolute top-3 left-3 bg-[var(--background)]/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-center border border-[var(--border)]">
                    <div className="text-lg font-bold text-gold leading-none">
                      {new Date(ef.start_at).getDate()}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-[var(--muted-foreground)] mt-0.5">
                      {new Date(ef.start_at).toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale, { month: 'short' })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-2">
                {ef.start_at && (
                  <div className="text-[10px] uppercase tracking-widest text-gold">
                    {formatDate(ef.start_at, locale, tz)} · {formatTime(ef.start_at, tz)}
                  </div>
                )}
                <h3 className="font-serif text-sm font-bold group-hover:text-gold transition-colors duration-300 line-clamp-2">
                  {eventTitle(ef, locale)}
                </h3>
                {artist && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    ♪ {artistDisplayName(artist.fields, locale)}
                  </p>
                )}
                {ef.price_info && (
                  <p className="text-[10px] text-[var(--muted-foreground)]/70">
                    {ef.price_info}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
