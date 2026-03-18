/**
 * Badge progress calculation for user (member) badges.
 *
 * Computes progress toward each user badge based on live Supabase data.
 * Also auto-persists newly earned badges that the pipeline hasn't caught yet.
 */

import { createClient } from '@supabase/supabase-js';

// ---------- Types ----------

export type BadgeCategory = 'milestone' | 'community' | 'recognition' | 'venue_excellence';

export interface BadgeProgress {
  badge_id: string;
  category: BadgeCategory;
  name: string;
  description: string;
  earned: boolean;
  earned_at: string | null;
  progress: { current: number; target: number } | null;
  sort_order: number;
}

export interface BadgeSummary {
  total: number;
  earned: number;
  recent: { badge_id: string; name: string; earned_at: string }[];
}

// ---------- Helpers ----------

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function localized(row: Record<string, unknown>, prefix: string, locale: string): string {
  const localeKey = `${prefix}_${locale === 'zh' ? 'zh' : locale}`;
  return (row[localeKey] as string) || (row[`${prefix}_en`] as string) || '';
}

// ---------- Core ----------

/**
 * Fetch user badge progress for the full /profile/badges page.
 * Runs server-side (RSC or API route).
 */
export async function getUserBadgeProgress(
  userId: string,
  locale: string,
): Promise<BadgeProgress[]> {
  const sb = getSupabase();

  // Fetch all required data in parallel
  const [
    { data: allBadges },
    { data: userBadges },
    { data: follows },
    { data: favorites },
    { data: profile },
    { data: conversations },
    { data: messageCheck },
  ] = await Promise.all([
    sb.from('badges').select('*').eq('target_type', 'user'),
    sb.from('user_badges').select('*').eq('user_id', userId),
    sb.from('follows').select('target_id, target_type').eq('user_id', userId),
    sb.from('favorites').select('item_id, item_type').eq('user_id', userId),
    sb.from('profiles').select('display_name, bio, avatar_url, website').eq('id', userId).single(),
    sb.from('conversations').select('id').or(`fan_user_id.eq.${userId},user_b_id.eq.${userId}`),
    sb.from('messages').select('id').eq('sender_id', userId).limit(1),
  ]);

  if (!allBadges) return [];

  // Build earned set
  const earnedMap = new Map<string, string>(); // badge_id → earned_at
  for (const ub of (userBadges || [])) {
    earnedMap.set(ub.badge_id, ub.earned_at);
  }

  // Pre-compute stats
  const artistFollows = (follows || []).filter(f => f.target_type === 'artist').length;
  const venueFollows = (follows || []).filter(f => f.target_type === 'venue').length;
  const totalFollows = artistFollows + venueFollows;

  // City explorer: need to look up city for each followed entity
  const followedEntityIds = (follows || [])
    .filter(f => f.target_type === 'artist' || f.target_type === 'venue')
    .map(f => ({ id: f.target_id, type: f.target_type }));

  let distinctCities = 0;
  if (followedEntityIds.length > 0) {
    const artistIds = followedEntityIds.filter(e => e.type === 'artist').map(e => e.id);
    const venueIds = followedEntityIds.filter(e => e.type === 'venue').map(e => e.id);
    const citySet = new Set<string>();

    if (artistIds.length > 0) {
      const { data: artists } = await sb
        .from('lineups')
        .select('artist_id, event_id')
        .in('artist_id', artistIds.slice(0, 100));
      if (artists && artists.length > 0) {
        const eventIds = [...new Set(artists.map(a => a.event_id).filter(Boolean))];
        if (eventIds.length > 0) {
          const { data: events } = await sb
            .from('events')
            .select('venue_id')
            .in('event_id', eventIds.slice(0, 200));
          const vIds = [...new Set((events || []).map(e => e.venue_id).filter(Boolean))];
          if (vIds.length > 0) {
            const { data: vRows } = await sb
              .from('venues')
              .select('city_id')
              .in('venue_id', vIds.slice(0, 200));
            for (const v of (vRows || [])) if (v.city_id) citySet.add(v.city_id);
          }
        }
      }
    }
    if (venueIds.length > 0) {
      const { data: venues } = await sb
        .from('venues')
        .select('city_id')
        .in('venue_id', venueIds.slice(0, 100));
      for (const v of (venues || [])) if (v.city_id) citySet.add(v.city_id);
    }
    distinctCities = citySet.size;
  }

  // Night owl: count favorited events starting after 10 PM
  let lateEventCount = 0;
  const eventFavs = (favorites || []).filter(f => f.item_type === 'event');
  if (eventFavs.length > 0) {
    const eventIds = eventFavs.map(f => f.item_id).slice(0, 100);
    const { data: events } = await sb
      .from('events')
      .select('start_at, timezone')
      .in('event_id', eventIds);
    for (const ev of (events || [])) {
      if (ev.start_at) {
        const hour = new Date(ev.start_at).getHours();
        if (hour >= 22 || hour < 4) lateEventCount++;
      }
    }
  }

  // Profile completeness
  const p = profile;
  const profileComplete = !!(p?.display_name && p?.bio && p?.avatar_url && p?.website);

  // Messages
  const hasMessage = (messageCheck || []).length > 0;
  const conversationCount = (conversations || []).length;

  // Build progress for each badge
  const newlyEarned: { user_id: string; badge_id: string }[] = [];
  const results: BadgeProgress[] = [];

  for (const badge of allBadges) {
    const bid = badge.badge_id;
    const progress = computeProgress(bid, {
      totalFollows, artistFollows, venueFollows,
      distinctCities, lateEventCount,
      profileComplete, hasMessage, conversationCount,
    }, badge.criteria_target);

    const isEarned = earnedMap.has(bid) || (progress ? progress.current >= progress.target : checkBinaryBadge(bid, { profileComplete }));

    // Auto-persist newly earned badges
    if (isEarned && !earnedMap.has(bid)) {
      newlyEarned.push({ user_id: userId, badge_id: bid });
    }

    results.push({
      badge_id: bid,
      category: (badge.category || 'milestone') as BadgeCategory,
      name: localized(badge, 'name', locale),
      description: localized(badge, 'description', locale),
      earned: isEarned,
      earned_at: earnedMap.get(bid) || (isEarned ? new Date().toISOString() : null),
      progress,
      sort_order: badge.sort_order || 0,
    });
  }

  // Persist newly earned badges (fire-and-forget, ignore errors)
  if (newlyEarned.length > 0) {
    sb.from('user_badges')
      .upsert(newlyEarned, { onConflict: 'user_id,badge_id', ignoreDuplicates: true })
      .then(() => {});
  }

  // Sort by sort_order
  results.sort((a, b) => a.sort_order - b.sort_order);
  return results;
}

/**
 * Lightweight badge summary for the profile page widget.
 */
export async function getUserBadgeSummary(
  userId: string,
  locale: string,
): Promise<BadgeSummary> {
  const sb = getSupabase();

  const [{ data: allBadges }, { data: userBadges }] = await Promise.all([
    sb.from('badges').select('badge_id').eq('target_type', 'user'),
    sb.from('user_badges').select('badge_id, earned_at').eq('user_id', userId).order('earned_at', { ascending: false }).limit(3),
  ]);

  const total = (allBadges || []).length;
  const earned = (userBadges || []).length;

  // Fetch names for recent badges
  const recentBadgeIds = (userBadges || []).map(ub => ub.badge_id);
  let recent: BadgeSummary['recent'] = [];
  if (recentBadgeIds.length > 0) {
    const { data: badgeRows } = await sb
      .from('badges')
      .select('*')
      .in('badge_id', recentBadgeIds);
    recent = (userBadges || []).map(ub => {
      const row = (badgeRows || []).find(b => b.badge_id === ub.badge_id);
      return {
        badge_id: ub.badge_id,
        name: row ? localized(row, 'name', locale) : ub.badge_id,
        earned_at: ub.earned_at,
      };
    });
  }

  return { total, earned, recent };
}

// ---------- Progress calculation ----------

interface UserStats {
  totalFollows: number;
  artistFollows: number;
  venueFollows: number;
  distinctCities: number;
  lateEventCount: number;
  profileComplete: boolean;
  hasMessage: boolean;
  conversationCount: number;
}

function computeProgress(
  badgeId: string,
  stats: UserStats,
  criteriaTarget: number | null,
): { current: number; target: number } | null {
  switch (badgeId) {
    case 'usr_first_follow':
      return { current: Math.min(stats.totalFollows, 1), target: criteriaTarget || 1 };
    case 'usr_super_fan':
      return { current: stats.artistFollows, target: criteriaTarget || 10 };
    case 'usr_scene_scout':
      return { current: stats.venueFollows, target: criteriaTarget || 5 };
    case 'usr_city_explorer':
      return { current: stats.distinctCities, target: criteriaTarget || 3 };
    case 'usr_night_owl':
      return { current: stats.lateEventCount, target: criteriaTarget || 5 };
    case 'usr_profile_complete':
      return null; // binary badge
    case 'usr_first_message':
      return { current: stats.hasMessage ? 1 : 0, target: criteriaTarget || 1 };
    case 'usr_social_butterfly':
      return { current: stats.conversationCount, target: criteriaTarget || 3 };
    default:
      return null;
  }
}

function checkBinaryBadge(
  badgeId: string,
  ctx: { profileComplete: boolean },
): boolean {
  switch (badgeId) {
    case 'usr_profile_complete':
      return ctx.profileComplete;
    default:
      return false;
  }
}
