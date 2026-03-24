'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';

interface FeaturedItem {
  event_id: string;
  note: string | null;
}

interface EventData {
  event_id: string;
  title_local: string | null;
  title_en: string | null;
  start_at: string | null;
  poster_url: string | null;
  venue_id: string[] | null;
  timezone: string | null;
}

interface VenueData {
  venue_id: string;
  name_local: string | null;
  name_en: string | null;
}

export default function FeaturedWall({ artistId }: { artistId: string }) {
  const locale = useLocale();
  const t = useTranslations('common');
  const [items, setItems] = useState<(FeaturedItem & { event?: EventData; venue?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/artist/featured-wall?artistId=${artistId}`);
        const data = await res.json();
        if (cancelled || !data.items?.length) { setLoading(false); return; }

        const featured: FeaturedItem[] = data.items;
        const eventIds = featured.map((f) => f.event_id);

        const supabase = createClient();
        const { data: events } = await supabase
          .from('events')
          .select('event_id, title_local, title_en, start_at, poster_url, venue_id, timezone')
          .in('event_id', eventIds);

        const eventMap = new Map((events || []).map((e) => [e.event_id, e]));

        // Resolve venues
        const venueIds = [...new Set((events || []).flatMap((e) => e.venue_id || []))];
        const venueMap = new Map<string, VenueData>();
        if (venueIds.length > 0) {
          const { data: venues } = await supabase
            .from('venues')
            .select('venue_id, name_local, name_en')
            .in('venue_id', venueIds);
          for (const v of venues || []) venueMap.set(v.venue_id, v);
        }

        if (!cancelled) {
          setItems(featured.map((f) => {
            const event = eventMap.get(f.event_id);
            const venue = event?.venue_id?.[0] ? venueMap.get(event.venue_id[0]) : undefined;
            return {
              ...f,
              event: event || undefined,
              venue: venue ? (venue.name_local || venue.name_en || '') : undefined,
            };
          }).filter((f) => f.event));
        }
      } catch (err) {
        console.error('Failed to load featured wall:', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [artistId]);

  if (loading || items.length === 0) return null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <FadeUp>
      <section className="border-t border-[var(--border)] pt-12">
        <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
          <svg className="w-5 h-5 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {t('featuredWall')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <FadeUpItem key={item.event_id} delay={(i % 3) * 60}>
              <Link
                href={`/${locale}/events/${item.event_id}`}
                className="block bg-[var(--card)] rounded-2xl border border-[var(--border)] card-hover group h-full overflow-hidden"
              >
                {/* Poster image */}
                {item.event?.poster_url && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={item.event.poster_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-5">
                  {item.venue && (
                    <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{item.venue}</p>
                  )}
                  <div className="text-xs uppercase tracking-widest text-gold mb-2">
                    {formatDate(item.event?.start_at)}
                  </div>
                  <h3 className="font-serif text-lg font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
                    {item.event?.title_local || item.event?.title_en || item.event_id}
                  </h3>
                  {item.note && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-2 italic leading-relaxed">
                      &ldquo;{item.note}&rdquo;
                    </p>
                  )}
                </div>
              </Link>
            </FadeUpItem>
          ))}
        </div>
      </section>
    </FadeUp>
  );
}
