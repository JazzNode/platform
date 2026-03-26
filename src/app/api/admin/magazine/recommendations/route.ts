import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
  const { isAdmin } = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // ── 1. Get all claimed/pro artists (tier >= 1) ──
  const { data: artists } = await supabase
    .from('artists')
    .select('artist_id, display_name, name_local, photo_url, tier, primary_instrument')
    .gte('tier', 1)
    .order('tier', { ascending: false });

  if (!artists || artists.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const artistIds = artists.map((a) => a.artist_id);

  // ── 2. Count existing articles per artist ──
  const { data: articles } = await supabase
    .from('magazine_articles')
    .select('linked_artist_ids')
    .in('status', ['published', 'draft']);

  const articleCountMap = new Map<string, number>();
  for (const article of articles || []) {
    for (const id of article.linked_artist_ids || []) {
      articleCountMap.set(id, (articleCountMap.get(id) || 0) + 1);
    }
  }

  // ── 3. Follower counts ──
  const { data: follows } = await supabase
    .from('follows')
    .select('target_id, created_at')
    .eq('target_type', 'artist')
    .in('target_id', artistIds);

  const followerMap = new Map<string, { total: number; recent: number }>();
  for (const f of follows || []) {
    const entry = followerMap.get(f.target_id) || { total: 0, recent: 0 };
    entry.total++;
    if (f.created_at >= thirtyDaysAgo) entry.recent++;
    followerMap.set(f.target_id, entry);
  }

  // ── 4. Shoutout counts ──
  const { data: shoutouts } = await supabase
    .from('artist_shoutouts')
    .select('artist_id')
    .in('artist_id', artistIds);

  const shoutoutMap = new Map<string, number>();
  for (const s of shoutouts || []) {
    shoutoutMap.set(s.artist_id, (shoutoutMap.get(s.artist_id) || 0) + 1);
  }

  // ── 5. Recent gigs (90 days) ──
  const { data: lineups } = await supabase
    .from('lineups')
    .select('artist_id, event_id')
    .in('artist_id', artistIds);

  const lineupEventIds = [...new Set((lineups || []).map((l) => l.event_id).filter(Boolean))];

  const recentGigMap = new Map<string, number>();
  if (lineupEventIds.length > 0) {
    const { data: events } = await supabase
      .from('events')
      .select('event_id, start_at')
      .in('event_id', lineupEventIds)
      .gte('start_at', ninetyDaysAgo);

    const recentEventIds = new Set((events || []).map((e) => e.event_id));

    for (const l of lineups || []) {
      if (recentEventIds.has(l.event_id)) {
        recentGigMap.set(l.artist_id, (recentGigMap.get(l.artist_id) || 0) + 1);
      }
    }
  }

  // ── 6. Score & rank ──
  const recommendations = artists
    .map((artist) => {
      const existingArticles = articleCountMap.get(artist.artist_id) || 0;
      if (existingArticles >= 3) return null; // Skip over-featured artists

      const followerData = followerMap.get(artist.artist_id) || { total: 0, recent: 0 };
      const shoutoutCount = shoutoutMap.get(artist.artist_id) || 0;
      const recentGigs = recentGigMap.get(artist.artist_id) || 0;
      const growthRate = followerData.total > 0
        ? (followerData.recent / followerData.total) * 100
        : 0;

      const score =
        artist.tier * 10 +
        followerData.total * 1 +
        shoutoutCount * 2 +
        recentGigs * 3 +
        growthRate * 5 -
        existingArticles * 15;

      // Determine top reason
      let topReason = 'Pro artist';
      if (growthRate > 20) topReason = 'High fan growth';
      else if (recentGigs >= 5) topReason = 'Active performer';
      else if (shoutoutCount >= 3) topReason = 'Peer endorsed';
      else if (followerData.total >= 10) topReason = 'Popular artist';

      return {
        artistId: artist.artist_id,
        name: artist.name_local || artist.display_name || artist.artist_id,
        photoUrl: artist.photo_url,
        tier: artist.tier,
        score: Math.round(score * 10) / 10,
        followerCount: followerData.total,
        shoutoutCount,
        recentGigs,
        existingArticles,
        instruments: artist.primary_instrument ? [artist.primary_instrument] : [],
        topReason,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score)
    .slice(0, 20);

  return NextResponse.json({ recommendations });
}
