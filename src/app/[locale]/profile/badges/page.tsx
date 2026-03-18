'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import BadgeCategorySection from '@/components/BadgeCategorySection';
import type { BadgeProgress, BadgeCategory } from '@/lib/badges';

/**
 * Client-side badge progress calculator.
 * Mirrors logic from lib/badges.ts but runs in the browser using the client Supabase.
 */
async function fetchBadgeProgress(
  userId: string,
  locale: string,
): Promise<BadgeProgress[]> {
  const sb = createClient();

  const [
    { data: allBadges },
    { data: userBadges },
    { data: follows },
    { data: favorites },
    { data: profile },
    { data: conversations },
    { data: messageCheck },
  ] = await Promise.all([
    sb.from('badges').select('*').eq('target_type', 'user').order('sort_order'),
    sb.from('user_badges').select('*').eq('user_id', userId),
    sb.from('follows').select('target_id, target_type').eq('user_id', userId),
    sb.from('favorites').select('item_id, item_type').eq('user_id', userId),
    sb.from('profiles').select('display_name, bio, avatar_url, website').eq('id', userId).single(),
    sb.from('conversations').select('id').or(`fan_user_id.eq.${userId},user_b_id.eq.${userId}`),
    sb.from('messages').select('id').eq('sender_id', userId).limit(1),
  ]);

  if (!allBadges) return [];

  const earnedMap = new Map<string, string>();
  for (const ub of (userBadges || [])) {
    earnedMap.set(ub.badge_id, ub.earned_at);
  }

  const artistFollows = (follows || []).filter(f => f.target_type === 'artist').length;
  const venueFollows = (follows || []).filter(f => f.target_type === 'venue').length;
  const totalFollows = artistFollows + venueFollows;

  // City explorer: look up cities from followed venues
  const venueIds = (follows || [])
    .filter(f => f.target_type === 'venue')
    .map(f => f.target_id);
  let distinctCities = 0;
  if (venueIds.length > 0) {
    const { data: venues } = await sb
      .from('venues')
      .select('city_id')
      .in('venue_id', venueIds.slice(0, 100));
    const citySet = new Set<string>();
    for (const v of (venues || [])) if (v.city_id) citySet.add(v.city_id);
    distinctCities = citySet.size;
  }

  // Night owl
  const eventFavs = (favorites || []).filter(f => f.item_type === 'event');
  let lateEventCount = 0;
  if (eventFavs.length > 0) {
    const eventIds = eventFavs.map(f => f.item_id).slice(0, 100);
    const { data: events } = await sb
      .from('events')
      .select('start_at')
      .in('event_id', eventIds);
    for (const ev of (events || [])) {
      if (ev.start_at) {
        const hour = new Date(ev.start_at).getHours();
        if (hour >= 22 || hour < 4) lateEventCount++;
      }
    }
  }

  const p = profile;
  const profileComplete = !!(p?.display_name && p?.bio && p?.avatar_url && p?.website);
  const hasMessage = (messageCheck || []).length > 0;
  const conversationCount = (conversations || []).length;

  const nameKey = `name_${locale === 'zh' ? 'zh' : locale}`;
  const descKey = `description_${locale === 'zh' ? 'zh' : locale}`;

  const newlyEarned: { user_id: string; badge_id: string }[] = [];
  const results: BadgeProgress[] = [];

  for (const badge of allBadges) {
    const bid = badge.badge_id as string;
    const target = badge.criteria_target as number | null;

    // Compute progress
    let progress: { current: number; target: number } | null = null;
    let binaryEarned = false;

    switch (bid) {
      case 'usr_first_follow':
        progress = { current: Math.min(totalFollows, 1), target: target || 1 }; break;
      case 'usr_super_fan':
        progress = { current: artistFollows, target: target || 10 }; break;
      case 'usr_scene_scout':
        progress = { current: venueFollows, target: target || 5 }; break;
      case 'usr_city_explorer':
        progress = { current: distinctCities, target: target || 3 }; break;
      case 'usr_night_owl':
        progress = { current: lateEventCount, target: target || 5 }; break;
      case 'usr_profile_complete':
        binaryEarned = profileComplete; break;
      case 'usr_first_message':
        progress = { current: hasMessage ? 1 : 0, target: target || 1 }; break;
      case 'usr_social_butterfly':
        progress = { current: conversationCount, target: target || 3 }; break;
    }

    const isEarned = earnedMap.has(bid) ||
      (progress ? progress.current >= progress.target : binaryEarned);

    if (isEarned && !earnedMap.has(bid)) {
      newlyEarned.push({ user_id: userId, badge_id: bid });
    }

    results.push({
      badge_id: bid,
      category: (badge.category || 'milestone') as BadgeCategory,
      name: (badge[nameKey] as string) || (badge.name_en as string) || bid,
      description: (badge[descKey] as string) || (badge.description_en as string) || '',
      earned: isEarned,
      earned_at: earnedMap.get(bid) || (isEarned ? new Date().toISOString() : null),
      progress,
      sort_order: (badge.sort_order as number) || 0,
    });
  }

  // Auto-persist newly earned badges
  if (newlyEarned.length > 0) {
    sb.from('user_badges')
      .upsert(newlyEarned, { onConflict: 'user_id,badge_id', ignoreDuplicates: true })
      .then(() => {});
  }

  return results;
}

export default function BadgesPage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchBadgeProgress(user.id, locale).then((data) => {
      if (!cancelled) {
        setBadges(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [user, locale]);

  if (loading) {
    return (
      <div className="space-y-8 py-6">
        {/* Skeleton */}
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

  // Group by category
  const milestones = badges.filter(b => b.category === 'milestone');
  const community = badges.filter(b => b.category === 'community');
  const totalEarned = badges.filter(b => b.earned).length;

  return (
    <div className="space-y-8 py-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold">{t('badgesTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {totalEarned} / {badges.length} {t('badgesEarned')}
        </p>
        {/* Overall progress bar */}
        <div className="mt-3 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold-dim)] to-[var(--color-gold)] transition-all duration-700 ease-out"
            style={{ width: `${badges.length > 0 ? (totalEarned / badges.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Badge sections */}
      <BadgeCategorySection
        title={t('badgesCategoryMilestone')}
        categoryKey="milestone"
        badges={milestones}
      />

      <BadgeCategorySection
        title={t('badgesCategoryCommunity')}
        categoryKey="community"
        badges={community}
      />
    </div>
  );
}
