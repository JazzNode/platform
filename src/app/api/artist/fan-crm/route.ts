import { NextRequest, NextResponse } from 'next/server';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId');
  const filter = req.nextUrl.searchParams.get('filter') || 'all'; // all | active | new
  if (!artistId) {
    return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });
  }

  const { isAuthorized } = await verifyArtistClaimToken(
    req.headers.get('authorization'),
    artistId,
  );
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Verify tier >= 2
  const { data: artist } = await supabase
    .from('artists')
    .select('tier')
    .eq('artist_id', artistId)
    .single();

  if (!artist || artist.tier < 2) {
    return NextResponse.json({ error: 'Premium required' }, { status: 403 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // ── 1. Followers with profile info ──
  const { data: followers } = await supabase
    .from('follows')
    .select('user_id, notification_level, created_at')
    .eq('target_type', 'artist')
    .eq('target_id', artistId)
    .order('created_at', { ascending: false });

  if (!followers || followers.length === 0) {
    return NextResponse.json({
      summary: { totalFollowers: 0, newThisMonth: 0, avgEngagement: 0 },
      fans: [],
    });
  }

  const userIds = followers.map((f) => f.user_id);

  // ── 2. Profile info ──
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, photo_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  // ── 3. Shoutout counts per user ──
  const { data: shoutouts } = await supabase
    .from('artist_shoutouts')
    .select('user_id, created_at')
    .eq('artist_id', artistId)
    .in('user_id', userIds);

  const shoutoutMap = new Map<string, { count: number; lastAt: string | null }>();
  for (const s of shoutouts || []) {
    const existing = shoutoutMap.get(s.user_id);
    if (existing) {
      existing.count++;
      if (s.created_at > (existing.lastAt || '')) existing.lastAt = s.created_at;
    } else {
      shoutoutMap.set(s.user_id, { count: 1, lastAt: s.created_at });
    }
  }

  // ── 4. Message counts per fan ──
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, fan_user_id')
    .eq('type', 'artist_fan')
    .eq('artist_id', artistId)
    .in('fan_user_id', userIds);

  const messageMap = new Map<string, { count: number; lastAt: string | null }>();

  if (conversations && conversations.length > 0) {
    const convIds = conversations.map((c) => c.id);
    const convFanMap = new Map(conversations.map((c) => [c.id, c.fan_user_id]));

    // Count messages sent by fans (not by the artist)
    const { data: messages } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, created_at')
      .in('conversation_id', convIds)
      .in('sender_id', userIds)
      .order('created_at', { ascending: false });

    for (const m of messages || []) {
      const fanId = convFanMap.get(m.conversation_id);
      if (!fanId || m.sender_id !== fanId) continue;
      const existing = messageMap.get(fanId);
      if (existing) {
        existing.count++;
        if (m.created_at > (existing.lastAt || '')) existing.lastAt = m.created_at;
      } else {
        messageMap.set(fanId, { count: 1, lastAt: m.created_at });
      }
    }
  }

  // ── 5. Build fan list with engagement scores ──
  const fans = followers.map((f) => {
    const profile = profileMap.get(f.user_id);
    const shoutoutData = shoutoutMap.get(f.user_id);
    const messageData = messageMap.get(f.user_id);

    const shoutoutCount = shoutoutData?.count || 0;
    const messageCount = messageData?.count || 0;
    const notifBonus = f.notification_level === 'All' ? 2 : f.notification_level === 'Important' ? 1 : 0;
    const engagementScore = 1 + shoutoutCount * 3 + messageCount * 2 + notifBonus;

    // Most recent activity date
    const dates = [shoutoutData?.lastAt, messageData?.lastAt].filter(Boolean) as string[];
    const lastActivity = dates.length > 0 ? dates.sort().reverse()[0] : null;

    return {
      userId: f.user_id,
      displayName: profile?.display_name || 'Anonymous',
      photoUrl: profile?.photo_url || null,
      followedAt: f.created_at,
      notificationLevel: f.notification_level || 'None',
      shoutoutCount,
      messageCount,
      engagementScore,
      lastActivity,
    };
  });

  // ── 6. Apply filter ──
  let filtered = fans;
  if (filter === 'active') {
    filtered = fans.filter((f) => f.lastActivity && f.lastActivity >= thirtyDaysAgo);
  } else if (filter === 'new') {
    filtered = fans.filter((f) => f.followedAt >= thirtyDaysAgo);
  }

  // Sort by engagement score descending
  filtered.sort((a, b) => b.engagementScore - a.engagementScore);

  // ── 7. Summary stats ──
  const newThisMonth = fans.filter((f) => f.followedAt >= thirtyDaysAgo).length;
  const totalEngagement = fans.reduce((sum, f) => sum + f.engagementScore, 0);
  const avgEngagement = fans.length > 0 ? Math.round((totalEngagement / fans.length) * 10) / 10 : 0;

  return NextResponse.json({
    summary: {
      totalFollowers: fans.length,
      newThisMonth,
      avgEngagement,
    },
    fans: filtered,
  });
}
