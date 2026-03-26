import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/venue/announcements?venueId=xxx
 * Returns announcements for a venue.
 * - Public visitors: only published + not expired
 * - Venue owner / admin: all (including drafts)
 */
export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venueId');
  if (!venueId) {
    return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Check if caller is venue owner
  let isOwner = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('claimed_venue_ids, role')
        .eq('id', user.id)
        .single();
      isOwner = !!(
        profile?.claimed_venue_ids?.includes(venueId) ||
        profile?.role === 'admin' ||
        profile?.role === 'owner'
      );
    }
  } catch {
    // Not authenticated — public view
  }

  let query = adminClient
    .from('venue_announcements')
    .select('id, venue_id, title, body, pinned, published, created_at, updated_at, expires_at')
    .eq('venue_id', venueId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (!isOwner) {
    query = query
      .eq('published', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }

  return NextResponse.json({ announcements: data || [] });
}

/**
 * POST /api/venue/announcements
 * Creates a new announcement. Optionally notifies followers.
 *
 * Body: { venueId, title, body, pinned?, published?, expiresAt?, notify? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { venueId, title, body, pinned, published, expiresAt, notify } = await request.json();

  if (!venueId || !title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check tier (announcements = tier 2)
  const adminClient = createAdminClient();
  const { data: venue } = await adminClient
    .from('venues')
    .select('tier')
    .eq('venue_id', venueId)
    .single();

  if (!isAdmin && (!venue || (venue.tier ?? 0) < 2)) {
    return NextResponse.json({ error: 'Premium tier required' }, { status: 403 });
  }

  // Create announcement
  const { data: announcement, error: insertError } = await adminClient
    .from('venue_announcements')
    .insert({
      venue_id: venueId,
      title: title.trim(),
      body: body.trim(),
      pinned: pinned ?? false,
      published: published ?? true,
      created_by: user.id,
      expires_at: expiresAt || null,
    })
    .select('id')
    .single();

  if (insertError || !announcement) {
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }

  // Notify followers if requested and announcement is published
  let notifyCount = 0;
  if (notify && (published ?? true)) {
    const { data: fans } = await adminClient
      .from('follows')
      .select('user_id')
      .eq('target_type', 'venue')
      .eq('target_id', venueId);

    if (fans && fans.length > 0) {
      const now = new Date().toISOString();
      const messageBody = `📢 ${title.trim()}\n\n${body.trim()}`;
      const fanIds = fans.map((f) => f.user_id);

      // Find or create conversations
      const { data: existingConvos } = await adminClient
        .from('conversations')
        .select('id, fan_user_id')
        .eq('type', 'venue_fan')
        .eq('venue_id', venueId)
        .in('fan_user_id', fanIds);

      const convoByFan = new Map<string, string>();
      existingConvos?.forEach((c) => convoByFan.set(c.fan_user_id, c.id));

      const fansNeedingConvo = fanIds.filter((id) => !convoByFan.has(id));
      if (fansNeedingConvo.length > 0) {
        const newConvos = fansNeedingConvo.map((fanId) => ({
          type: 'venue_fan',
          venue_id: venueId,
          fan_user_id: fanId,
          last_message_at: now,
        }));
        const { data: created } = await adminClient
          .from('conversations')
          .insert(newConvos)
          .select('id, fan_user_id');
        created?.forEach((c) => convoByFan.set(c.fan_user_id, c.id));
      }

      // Insert messages
      const messages = fanIds
        .filter((fanId) => convoByFan.has(fanId))
        .map((fanId) => ({
          conversation_id: convoByFan.get(fanId)!,
          sender_id: user.id,
          body: messageBody,
          intent_type: 'announcement',
          created_at: now,
        }));

      if (messages.length > 0) {
        await adminClient.from('messages').insert(messages);
        notifyCount = messages.length;

        // Update last_message_at
        const convoIds = [...new Set(messages.map((m) => m.conversation_id))];
        await adminClient
          .from('conversations')
          .update({ last_message_at: now })
          .in('id', convoIds);
      }
    }
  }

  return NextResponse.json({
    id: announcement.id,
    notifyCount,
  });
}

/**
 * PATCH /api/venue/announcements
 * Updates an existing announcement.
 *
 * Body: { id, venueId, title?, body?, pinned?, published?, expiresAt? }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, venueId, title, body, pinned, published, expiresAt } = await request.json();

  if (!id || !venueId) {
    return NextResponse.json({ error: 'Missing id or venueId' }, { status: 400 });
  }

  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title.trim();
  if (body !== undefined) updates.body = body.trim();
  if (pinned !== undefined) updates.pinned = pinned;
  if (published !== undefined) updates.published = published;
  if (expiresAt !== undefined) updates.expires_at = expiresAt || null;

  const { error } = await adminClient
    .from('venue_announcements')
    .update(updates)
    .eq('id', id)
    .eq('venue_id', venueId);

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/venue/announcements
 * Deletes an announcement.
 *
 * Body: { id, venueId }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, venueId } = await request.json();

  if (!id || !venueId) {
    return NextResponse.json({ error: 'Missing id or venueId' }, { status: 400 });
  }

  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('venue_announcements')
    .delete()
    .eq('id', id)
    .eq('venue_id', venueId);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
