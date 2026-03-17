'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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

interface Props {
  locale: string;
  events: HomeEvent[];
  regionLabels: Record<string, string>;
  regionOrder: string[];
  sectionTitle: string;
  viewAllHref: string;
  viewAllLabel: string;
  noEventsLabel: string;
  worldMapLabel: string;
}

export default function HomeEventsSection({
  locale,
  events,
  regionLabels,
  regionOrder,
  sectionTitle,
  viewAllHref,
  viewAllLabel,
  noEventsLabel,
  worldMapLabel,
}: Props) {
  const { profile } = useAuth();

  // Derive default region from user's profile
  const defaultRegion = useMemo(() => {
    if (!profile?.region) return null;
    return REGION_TO_COUNTRY[profile.region] || null;
  }, [profile?.region]);

  const [activeRegion, setActiveRegion] = useState<string | null>(defaultRegion);

  // Update if profile loads after initial render
  // (useEffect not needed — useState initializer + key re-mount handles it)

  const filtered = useMemo(() => {
    if (!activeRegion) return events;
    return events.filter((e) => e.country_code === activeRegion);
  }, [events, activeRegion]);

  const pillBase = 'px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 border font-serif font-light cursor-pointer';
  const pillActive = 'bg-gold/20 border-gold text-gold';
  const pillInactive = 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]';

  return (
    <section>
      <FadeUp>
        <div className="flex items-end justify-between mb-8 border-b border-[var(--border)] pb-6">
          <h2 className="font-serif text-4xl sm:text-5xl font-bold">{sectionTitle}</h2>
          <Link href={viewAllHref} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift">
            {viewAllLabel} →
          </Link>
        </div>
      </FadeUp>

      {/* Region filter pills */}
      <FadeUpItem delay={60}>
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            onClick={() => setActiveRegion(null)}
            className={`${pillBase} ${!activeRegion ? pillActive : pillInactive}`}
          >
            {worldMapLabel}
          </button>
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
      </FadeUpItem>

      {filtered.length === 0 ? (
        <p className="text-[#8A8578]">{noEventsLabel}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 9).map((event, i) => (
            <FadeUpItem key={event.id} delay={(i % 3) * 60} className={i >= 6 ? 'hidden sm:block' : undefined}>
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
                  <p className="text-xs text-[#6A6560] mt-2">
                    w/ {event.sidemen.join(', ')}
                  </p>
                )}
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
          ))}
        </div>
      )}
    </section>
  );
}
