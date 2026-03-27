import { NextRequest, NextResponse } from 'next/server';
import { verifyHQToken, hasPermission } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/admin/conversations — List member_hq conversations for admin
 */
export async function GET(request: NextRequest) {
  const { isHQ, role } = await verifyHQToken(request.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ['admin', 'editor', 'moderator', 'owner'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Fetch all member_hq conversations
  const { data: convos, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('type', 'member_hq')
    .order('last_message_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!convos || convos.length === 0) return NextResponse.json({ conversations: [] });

  // Enrich with user profiles
  const userIds = [...new Set(convos.map((c) => c.fan_user_id).filter(Boolean))];
  let profileMap = new Map<string, { display_name: string | null; username: string | null; avatar_url: string | null; claimed_venue_ids: string[] | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, claimed_venue_ids')
      .in('id', userIds);
    profileMap = new Map((profiles || []).map((p) => [p.id, p]));
  }

  // Get tier info for all claimed venues (to identify VIP/Elite users)
  const allClaimedVenueIds = [...new Set(
    [...profileMap.values()].flatMap((p) => p.claimed_venue_ids || []),
  )];
  const vipVenueIds = new Set<string>();
  if (allClaimedVenueIds.length > 0) {
    const { data: venues } = await supabase
      .from('venues')
      .select('venue_id, tier')
      .in('venue_id', allClaimedVenueIds)
      .gte('tier', 3);
    for (const v of venues ?? []) vipVenueIds.add(v.venue_id);
  }

  // Get unread counts per conversation (messages not sent by any admin)
  const enriched = await Promise.all(
    convos.map(async (convo) => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', convo.id)
        .is('read_at', null)
        .is('sender_role', null); // messages from member (not admin)

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('body, sender_id, sender_role, created_at')
        .eq('conversation_id', convo.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const userProfile = profileMap.get(convo.fan_user_id);
      const isVip = (userProfile?.claimed_venue_ids || []).some((vid) => vipVenueIds.has(vid));
      return {
        ...convo,
        user_display: userProfile?.display_name || userProfile?.username || null,
        user_avatar: userProfile?.avatar_url || null,
        is_vip: isVip,
        unread_count: count || 0,
        last_message: lastMsg?.body || null,
        last_message_at: lastMsg?.created_at || convo.last_message_at,
      };
    })
  );

  // Sort: VIP first, then by recency
  enriched.sort((a, b) => {
    if (a.is_vip && !b.is_vip) return -1;
    if (!a.is_vip && b.is_vip) return 1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  return NextResponse.json({ conversations: enriched });
}

/**
 * POST /api/admin/conversations/:id/messages — Admin sends a message in a member_hq conversation
 * (Using POST on the conversations route with conversation_id in body)
 */
export async function POST(request: NextRequest) {
  const { isHQ, role, userId } = await verifyHQToken(request.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ['admin', 'editor', 'moderator', 'owner']) || !userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { conversationId, body: msgBody } = await request.json();
  if (!conversationId || !msgBody?.trim()) {
    return NextResponse.json({ error: 'Missing conversationId or body' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify conversation exists and is member_hq
  const { data: convo } = await supabase
    .from('conversations')
    .select('id, type')
    .eq('id', conversationId)
    .single();

  if (!convo || convo.type !== 'member_hq') {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Insert message with sender_role = 'admin'
  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      sender_role: 'admin',
      body: msgBody.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return NextResponse.json({ message: msg });
}
