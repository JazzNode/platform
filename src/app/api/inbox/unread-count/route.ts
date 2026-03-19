import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/inbox/unread-count
 *
 * Returns total unread message count for the authenticated user, broken down by:
 * - profile: unread in conversations where user is fan_user_id or user_b_id
 * - artist:<id>: unread in artist_fan conversations for each claimed artist
 * - venue:<id>: unread in venue_fan conversations for each claimed venue
 * - hq: unread in member_hq conversations (admin/owner only)
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ total: 0, breakdown: {} });
  }

  // Fetch profile to get claimed artists/venues and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_artist_ids, claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ total: 0, breakdown: {} });
  }

  const breakdown: Record<string, number> = {};

  // 1. Personal inbox: conversations where user is fan_user_id or user_b_id
  //    (includes artist_fan, venue_fan, member_hq, member_member from fan side)
  const { data: personalConvos } = await supabase
    .from('conversations')
    .select('id')
    .or(`fan_user_id.eq.${user.id},user_b_id.eq.${user.id}`);

  if (personalConvos && personalConvos.length > 0) {
    const convoIds = personalConvos.map((c) => c.id);
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convoIds)
      .neq('sender_id', user.id)
      .is('read_at', null);
    breakdown.profile = count || 0;
  } else {
    breakdown.profile = 0;
  }

  // 2. Artist inboxes: conversations of type artist_fan for each claimed artist
  //    (as the artist manager, messages from fans)
  const claimedArtists = profile.claimed_artist_ids || [];
  for (const artistId of claimedArtists) {
    const { data: artistConvos } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'artist_fan')
      .eq('artist_id', artistId);

    if (artistConvos && artistConvos.length > 0) {
      const convoIds = artistConvos.map((c) => c.id);
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convoIds)
        .neq('sender_id', user.id)
        .is('read_at', null);
      breakdown[`artist:${artistId}`] = count || 0;
    } else {
      breakdown[`artist:${artistId}`] = 0;
    }
  }

  // 3. Venue inboxes: conversations of type venue_fan for each claimed venue
  const claimedVenues = profile.claimed_venue_ids || [];
  for (const venueId of claimedVenues) {
    const { data: venueConvos } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'venue_fan')
      .eq('venue_id', venueId);

    if (venueConvos && venueConvos.length > 0) {
      const convoIds = venueConvos.map((c) => c.id);
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convoIds)
        .neq('sender_id', user.id)
        .is('read_at', null);
      breakdown[`venue:${venueId}`] = count || 0;
    } else {
      breakdown[`venue:${venueId}`] = 0;
    }
  }

  // 4. HQ inbox: member_hq conversations (admin/owner only)
  if (profile.role === 'admin' || profile.role === 'owner') {
    const { data: hqConvos } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'member_hq');

    if (hqConvos && hqConvos.length > 0) {
      const convoIds = hqConvos.map((c) => c.id);
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convoIds)
        .neq('sender_id', user.id)
        .is('read_at', null);
      breakdown.hq = count || 0;
    } else {
      breakdown.hq = 0;
    }
  }

  const total = Object.values(breakdown).reduce((sum, n) => sum + n, 0);

  // 5. Unread notifications count
  const { count: notifCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  return NextResponse.json({ total, breakdown, notifications: notifCount || 0 });
}
