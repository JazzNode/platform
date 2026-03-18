'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import BadgeCategorySection from '@/components/BadgeCategorySection';
import type { BadgeProgress, BadgeCategory } from '@/lib/badges';

async function fetchVenueBadgeProgress(
  venueId: string,
  locale: string,
): Promise<BadgeProgress[]> {
  const sb = createClient();

  const [
    { data: allBadges },
    { data: venue },
    { data: events },
  ] = await Promise.all([
    sb.from('badges').select('*').eq('target_type', 'venue').order('sort_order'),
    sb.from('venues').select('*').eq('venue_id', venueId).single(),
    sb.from('events').select('event_id, venue_id, tag_list').eq('venue_id', venueId).limit(500),
  ]);

  if (!allBadges || !venue) return [];

  // Stats
  const totalEvents = (events || []).length;

  // Unique tags
  const tagSet = new Set<string>();
  for (const ev of (events || [])) {
    for (const tid of (ev.tag_list || [])) tagSet.add(tid);
  }
  const uniqueTagCount = tagSet.size;

  // Distinct artists + countries from lineups
  const eventIds = (events || []).map(e => e.event_id);
  let distinctArtistCount = 0;
  let distinctCountryCount = 0;
  if (eventIds.length > 0) {
    const { data: lineups } = await sb
      .from('lineups')
      .select('artist_id')
      .in('event_id', eventIds.slice(0, 200));
    const artistIds = [...new Set((lineups || []).map(l => l.artist_id))];
    distinctArtistCount = artistIds.length;

    if (artistIds.length > 0) {
      const { data: artists } = await sb
        .from('artists')
        .select('country_code')
        .in('artist_id', artistIds.slice(0, 200));
      distinctCountryCount = new Set((artists || []).map(a => a.country_code).filter(Boolean)).size;
    }
  }

  // Friendly language count
  const friendlyLangCount = [
    venue.friendly_en, venue.friendly_ja, venue.friendly_ko,
    venue.friendly_th, venue.friendly_id,
  ].filter(Boolean).length;

  const nameKey = `name_${locale === 'zh' ? 'zh' : locale}`;
  const descKey = `description_${locale === 'zh' ? 'zh' : locale}`;

  return allBadges.map((badge) => {
    const bid = badge.badge_id as string;
    const target = badge.criteria_target as number | null;

    let progress: { current: number; target: number } | null = null;
    let binaryEarned = false;

    switch (bid) {
      case 'ven_genre_explorer':
        progress = { current: uniqueTagCount, target: target || 5 }; break;
      case 'ven_artist_magnet':
        progress = { current: distinctArtistCount, target: target || 10 }; break;
      case 'ven_world_stage':
        progress = { current: distinctCountryCount, target: target || 3 }; break;
      case 'ven_multilingual':
        progress = { current: friendlyLangCount, target: target || 2 }; break;
      case 'ven_marathon':
        progress = { current: totalEvents, target: target || 20 }; break;
      case 'ven_jazz_hub':
        binaryEarned = venue.jazz_frequency === 'nightly'; break;
      case 'ven_crowd_magnet':
        binaryEarned = false; break; // requires global ranking, computed by pipeline
      case 'ven_house_keys':
        binaryEarned = !!(venue.tier && venue.tier >= 1); break;
    }

    const isEarned = progress ? progress.current >= progress.target : binaryEarned;

    return {
      badge_id: bid,
      category: (badge.category || 'venue_excellence') as BadgeCategory,
      name: (badge[nameKey] as string) || (badge.name_en as string) || bid,
      description: (badge[descKey] as string) || (badge.description_en as string) || '',
      earned: isEarned,
      earned_at: null,
      progress,
      sort_order: (badge.sort_order as number) || 0,
    };
  });
}

export default function VenueBadgesPage() {
  const t = useTranslations('venueDashboard');
  const tProfile = useTranslations('profile');
  const locale = useLocale();
  const params = useParams<{ slug: string }>();
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.slug) return;
    let cancelled = false;

    fetchVenueBadgeProgress(params.slug, locale).then((data) => {
      if (!cancelled) {
        setBadges(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [params.slug, locale]);

  if (loading) {
    return (
      <div className="space-y-8 py-6">
        <div className="space-y-4">
          <div className="h-6 w-32 bg-[var(--muted)] rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-[var(--muted)] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalEarned = badges.filter(b => b.earned).length;

  return (
    <div className="space-y-8 py-6">
      <div>
        <h1 className="text-xl font-bold">{t('badges')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {totalEarned} / {badges.length} {tProfile('badgesEarned')}
        </p>
        <div className="mt-3 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-dim)] to-[var(--color-gold)] transition-all duration-700 ease-out"
            style={{ width: `${badges.length > 0 ? (totalEarned / badges.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <BadgeCategorySection
        title={tProfile('badgesCategoryVenueExcellence') || 'Venue Excellence'}
        categoryKey="venue_excellence"
        badges={badges}
      />
    </div>
  );
}
