import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * POST /api/broadcasts/send
 * Creates a broadcast and inserts messages into each fan's conversation.
 *
 * Body: { artistId, title, body, channel } OR { venueId, title, body, channel }
 * Requires authenticated user who has claimed the artist or venue.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { artistId, venueId, title, body, channel } = await request.json();

  const isVenue = !!venueId;
  const targetId = venueId || artistId;

  if (!targetId || !title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify user has claimed this artist or venue
  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_artist_ids, claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const isOwner = isVenue
    ? profile.claimed_venue_ids?.includes(targetId)
    : profile.claimed_artist_ids?.includes(targetId);
  const isAdmin = profile.role === 'admin' || profile.role === 'owner';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // 1. Create broadcast record
  const broadcastData: Record<string, unknown> = {
    sender_id: user.id,
    title: title.trim(),
    body: body.trim(),
    channel: channel || 'inbox',
    sent_at: new Date().toISOString(),
  };

  if (isVenue) {
    broadcastData.venue_id = targetId;
  } else {
    broadcastData.artist_id = targetId;
  }

  const { data: broadcast, error: broadcastError } = await adminClient
    .from('broadcasts')
    .insert(broadcastData)
    .select('id')
    .single();

  if (broadcastError || !broadcast) {
    return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 });
  }

  // 2. Get all fans who follow this entity
  const { data: fans } = await adminClient
    .from('follows')
    .select('user_id')
    .eq('target_type', isVenue ? 'venue' : 'artist')
    .eq('target_id', targetId);

  if (!fans || fans.length === 0) {
    return NextResponse.json({
      broadcastId: broadcast.id,
      deliveryCount: 0,
    });
  }

  // 3. Create broadcast_deliveries (for stats)
  const deliveries = fans.map((f) => ({
    broadcast_id: broadcast.id,
    user_id: f.user_id,
  }));
  await adminClient.from('broadcast_deliveries').insert(deliveries);

  // 4. For each fan, find or create conversation, then insert message
  const now = new Date().toISOString();
  const messageBody = `${title.trim()}\n\n${body.trim()}`;
  let insertedCount = 0;

  const conversationType = isVenue ? 'venue_fan' : 'artist_fan';
  const entityIdField = isVenue ? 'venue_id' : 'artist_id';

  // Batch: get all existing conversations for this entity with these fans
  const fanIds = fans.map((f) => f.user_id);
  const { data: existingConvos } = await adminClient
    .from('conversations')
    .select('id, fan_user_id')
    .eq('type', conversationType)
    .eq(entityIdField, targetId)
    .in('fan_user_id', fanIds);

  const convoByFan = new Map<string, string>();
  existingConvos?.forEach((c) => convoByFan.set(c.fan_user_id, c.id));

  // Find fans without existing conversations
  const fansNeedingConvo = fanIds.filter((id) => !convoByFan.has(id));

  // Batch create missing conversations
  if (fansNeedingConvo.length > 0) {
    const newConvos = fansNeedingConvo.map((fanId) => ({
      type: conversationType,
      [entityIdField]: targetId,
      fan_user_id: fanId,
      last_message_at: now,
    }));

    const { data: created } = await adminClient
      .from('conversations')
      .insert(newConvos)
      .select('id, fan_user_id');

    created?.forEach((c) => convoByFan.set(c.fan_user_id, c.id));
  }

  // Batch insert messages
  const messages = fanIds
    .filter((fanId) => convoByFan.has(fanId))
    .map((fanId) => ({
      conversation_id: convoByFan.get(fanId)!,
      sender_id: user.id,
      broadcast_id: broadcast.id,
      body: messageBody,
      created_at: now,
    }));

  if (messages.length > 0) {
    const { error: msgError } = await adminClient.from('messages').insert(messages);
    if (!msgError) insertedCount = messages.length;
  }

  // Update last_message_at on all affected conversations
  const convoIds = [...new Set(messages.map((m) => m.conversation_id))];
  if (convoIds.length > 0) {
    await adminClient
      .from('conversations')
      .update({ last_message_at: now })
      .in('id', convoIds);
  }

  return NextResponse.json({
    broadcastId: broadcast.id,
    deliveryCount: fans.length,
    messageCount: insertedCount,
  });
}
