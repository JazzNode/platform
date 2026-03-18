'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import BadgeCategorySection from '@/components/BadgeCategorySection';
import type { BadgeProgress, BadgeCategory } from '@/lib/badges';

async function fetchArtistBadgeProgress(
  artistId: string,
  locale: string,
): Promise<BadgeProgress[]> {
  const sb = createClient();

  const [
    { data: allBadges },
    { data: artist },
    { data: events },
    { data: lineups },
    { data: cities },
  ] = await Promise.all([
    sb.from('badges').select('*').eq('target_type', 'artist').order('sort_order'),
    sb.from('artists').select('*').eq('artist_id', artistId).single(),
    sb.from('events').select('event_id, start_at, venue_id').limit(500),
    sb.from('lineups').select('lineup_id, event_id, artist_id, role').eq('artist_id', artistId),
    sb.from('cities').select('city_id, country_code').limit(500),
  ]);

  if (!allBadges || !artist) return [];

  // Stats for progress-based badges
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const artistEventIds = new Set((lineups || []).map(l => l.event_id));
  const recentEventCount = (events || []).filter(
    e => artistEventIds.has(e.event_id) && e.start_at && new Date(e.start_at) >= ninetyDaysAgo,
  ).length;

  const cityMap = new Map((cities || []).map(c => [c.city_id, c.country_code]));
  const artistCityIds: string[] = artist.city_id ? (Array.isArray(artist.city_id) ? artist.city_id : [artist.city_id]) : [];
  const distinctCountries = new Set(artistCityIds.map(cid => cityMap.get(cid)).filter(Boolean)).size;

  const bandleaderCount = (lineups || []).filter(l => l.role === 'bandleader').length;
  const distinctRoles = new Set((lineups || []).map(l => l.role).filter(Boolean)).size;
  const instrumentCount = (artist.instrument_list || []).length;

  // Follow count for fan_favorite (top 10%)
  const { count: followerCount } = await sb
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', 'artist')
    .eq('target_id', artistId);

  const nameKey = `name_${locale === 'zh' ? 'zh' : locale}`;
  const descKey = `description_${locale === 'zh' ? 'zh' : locale}`;

  return allBadges.map((badge) => {
    const bid = badge.badge_id as string;
    const target = badge.criteria_target as number | null;

    // Compute progress or binary earned
    let progress: { current: number; target: number } | null = null;
    let binaryEarned = false;

    switch (bid) {
      case 'art_gig_warrior':
        progress = { current: recentEventCount, target: target || 8 }; break;
      case 'art_globetrotter':
        progress = { current: distinctCountries, target: target || 3 }; break;
      case 'art_bandleader':
        progress = { current: bandleaderCount, target: target || 3 }; break;
      case 'art_versatile':
        progress = { current: distinctRoles, target: target || 3 }; break;
      case 'art_multi_instrumentalist':
        progress = { current: instrumentCount, target: target || 3 }; break;
      case 'art_local_hero':
        binaryEarned = artist.is_master === true && artist.country_code === 'TW'; break;
      case 'art_in_the_house':
        binaryEarned = !!(artist.tier && artist.tier >= 1); break;
      case 'art_accepting_students':
        binaryEarned = artist.accepting_students === true; break;
      case 'art_fan_favorite':
        binaryEarned = (followerCount || 0) > 0; break; // simplified: has any followers
    }

    const isEarned = progress ? progress.current >= progress.target : binaryEarned;

    return {
      badge_id: bid,
      category: (badge.category || 'recognition') as BadgeCategory,
      name: (badge[nameKey] as string) || (badge.name_en as string) || bid,
      description: (badge[descKey] as string) || (badge.description_en as string) || '',
      earned: isEarned,
      earned_at: null,
      progress,
      sort_order: (badge.sort_order as number) || 0,
    };
  });
}

export default function ArtistBadgesPage() {
  const t = useTranslations('artistStudio');
  const tProfile = useTranslations('profile');
  const locale = useLocale();
  const params = useParams<{ slug: string }>();
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.slug) return;
    let cancelled = false;

    fetchArtistBadgeProgress(params.slug, locale).then((data) => {
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
        title={tProfile('badgesCategoryRecognition') || 'Recognition'}
        categoryKey="recognition"
        badges={badges}
      />
    </div>
  );
}
