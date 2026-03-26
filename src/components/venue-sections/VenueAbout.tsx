import type { Venue } from '@/lib/supabase';
import { localized } from '@/lib/helpers';
import EditableContent from '@/components/EditableContent';
import TierGate from '@/components/TierGate';
import BadgeCategorySection from '@/components/BadgeCategorySection';
import type { BadgeProgress } from '@/lib/badges';
import FadeUp from '@/components/animations/FadeUp';

interface VenueAboutProps {
  venue: { id: string; fields: Venue };
  locale: string;
  description: string | null | undefined;
  stats: {
    totalEvents: number;
    uniqueArtists: number;
    yearsActive: number | null;
    capacity: number | null;
  };
  badges: BadgeProgress[];
  t: (key: string) => string;
}

export default function VenueAbout({
  venue,
  locale,
  description,
  stats,
  badges,
  t,
}: VenueAboutProps) {
  const f = venue.fields;
  const hasStats = stats.totalEvents > 0;
  const earnedBadges = badges.filter((b) => b.earned);

  return (
    <section className="border-t border-[var(--border)] pt-12">
      <h2 className="font-serif text-xl sm:text-2xl font-bold mb-8">
        {t('aboutVenue')}
      </h2>

      <div className="space-y-8">
        {/* Description */}
        <TierGate entityType="venue" featureKey="description" currentTier={f.tier ?? 0}>
          <EditableContent
            entityType="venue"
            entityId={venue.id}
            fieldPrefix="description"
            locale={locale}
            content={description ?? undefined}
            contentClassName="text-[#C4BFB3] leading-relaxed text-[15px]"
          />
        </TierGate>

        {/* Stats Grid */}
        {hasStats && (
          <FadeUp>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gold">{stats.totalEvents}</div>
                <div className="text-[10px] text-[var(--muted-foreground)] mt-1 uppercase tracking-widest">
                  {t('totalGigs')}
                </div>
              </div>
              {stats.uniqueArtists > 0 && (
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-gold">{stats.uniqueArtists}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mt-1 uppercase tracking-widest">
                    {t('artists')}
                  </div>
                </div>
              )}
              {stats.yearsActive && stats.yearsActive > 0 && (
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-gold">{stats.yearsActive}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mt-1 uppercase tracking-widest">
                    {locale === 'zh' || locale === 'ja' ? '年' : locale === 'ko' ? '년' : 'years'}
                  </div>
                </div>
              )}
              {stats.capacity != null && stats.capacity > 0 && (
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-gold">{stats.capacity}</div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mt-1 uppercase tracking-widest">
                    {t('capacitySeats')}
                  </div>
                </div>
              )}
            </div>
          </FadeUp>
        )}

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <FadeUp>
            <BadgeCategorySection
              title={t('badgesCategoryVenueExcellence')}
              categoryKey="venue_excellence"
              badges={badges}
              earnedOnly
            />
          </FadeUp>
        )}
      </div>
    </section>
  );
}
