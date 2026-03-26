import Image from 'next/image';
import Link from 'next/link';
import type { Event as VenueEvent, Artist } from '@/lib/supabase';
import { eventTitle, formatDate, formatTime, artistDisplayName } from '@/lib/helpers';

interface VenueFeaturedEventProps {
  event: { id: string; fields: VenueEvent };
  artist: { id: string; fields: Artist } | null;
  locale: string;
  t: (key: string) => string;
  /** When true, show "Today's Jazz" instead of "Next Show" */
  isToday?: boolean;
}

export default function VenueFeaturedEvent({
  event,
  artist,
  locale,
  t,
  isToday = false,
}: VenueFeaturedEventProps) {
  const ef = event.fields;
  const tz = ef.timezone || 'Asia/Taipei';
  const poster = ef.poster_url;
  const title = eventTitle(ef, locale);

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <span className="pulse-dot" />
        <h2 className="font-serif text-xl sm:text-2xl font-bold">
          {isToday ? t('tonight') : t('nextShow')}
        </h2>
      </div>

      <Link
        href={`/${locale}/events/${event.id}`}
        className="group block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] card-hover"
      >
        <div className="flex flex-col sm:flex-row">
          {/* Poster */}
          <div className="relative w-full sm:w-[280px] lg:w-[360px] shrink-0 aspect-[3/4] sm:aspect-auto sm:h-auto min-h-[200px] sm:min-h-[280px] overflow-hidden">
            {poster ? (
              <Image
                src={poster}
                alt={title}
                fill
                className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
                sizes="(min-width: 640px) 360px, 100vw"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent flex items-center justify-center">
                <svg className="w-16 h-16 text-gold/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[var(--card)]/30 sm:bg-none" />
          </div>

          {/* Info */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center space-y-4">
            {/* Date badge */}
            {ef.start_at && (
              <div className="flex items-center gap-3">
                <div className="bg-gold/10 border border-gold/20 rounded-xl px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-gold leading-none">
                    {new Date(ef.start_at).getDate()}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-gold/70 mt-0.5">
                    {new Date(ef.start_at).toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale, { month: 'short' })}
                  </div>
                </div>
                <div className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
                  {formatDate(ef.start_at, locale, tz)}
                  <br />
                  {formatTime(ef.start_at, tz)}
                </div>
              </div>
            )}

            <h3 className="font-serif text-2xl sm:text-3xl font-bold group-hover:text-gold transition-colors duration-300 line-clamp-2">
              {title}
            </h3>

            {artist && (
              <p className="text-sm text-[var(--muted-foreground)] flex items-center gap-2">
                <svg className="w-4 h-4 text-gold/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                {artistDisplayName(artist.fields, locale)}
              </p>
            )}

            {ef.price_info && (
              <p className="text-sm text-[var(--muted-foreground)]">
                {ef.price_info}
              </p>
            )}

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-gold group-hover:text-gold-bright transition-colors">
                {t('viewDetails')}
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
