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

  // 2. Artist inboxes: messages + notifications for each claimed artist
  const claimedArtists = profile.claimed_artist_ids || [];
  for (const artistId of claimedArtists) {
    let msgCount = 0;
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
      msgCount = count || 0;
    }

    // Artist notifications
    const { count: artistNotifCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('reference_type', 'artist')
      .eq('reference_id', artistId)
      .is('read_at', null);

    breakdown[`artist:${artistId}`] = msgCount + (artistNotifCount || 0);
  }

  // 3. Venue inboxes: messages + notifications for each claimed venue
  const claimedVenues = profile.claimed_venue_ids || [];
  for (const venueId of claimedVenues) {
    let msgCount = 0;
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
      msgCount = count || 0;
    }

    // Venue notifications
    const { count: venueNotifCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('reference_type', 'venue')
      .eq('reference_id', venueId)
      .is('read_at', null);

    breakdown[`venue:${venueId}`] = msgCount + (venueNotifCount || 0);
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

  // 5. Unread notifications count (personal only — exclude artist/venue scoped notifications)
  const { count: notifCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)
    .or('reference_type.is.null,reference_type.not.in.(artist,venue)');

  return NextResponse.json({ total, breakdown, notifications: notifCount || 0 });
}
