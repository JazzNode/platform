import { NextRequest, NextResponse } from 'next/server';
import { verifyHQToken, hasPermission } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/admin/subscriptions — List venue subscription requests
 */
export async function GET(request: NextRequest) {
  const { isHQ, role } = await verifyHQToken(request.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ['admin', 'owner'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('venue_subscriptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with user profiles
  const userIds = [...new Set((data || []).map((s) => s.user_id).filter(Boolean))];
  let profileMap = new Map<string, { display_name: string | null; username: string | null; avatar_url: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', userIds);
    profileMap = new Map((profiles || []).map((p) => [p.id, p]));
  }

  const enriched = (data || []).map((sub) => ({
    ...sub,
    user_display: profileMap.get(sub.user_id)?.display_name || profileMap.get(sub.user_id)?.username || null,
    user_avatar: profileMap.get(sub.user_id)?.avatar_url || null,
  }));

  return NextResponse.json({ subscriptions: enriched });
}

/**
 * POST /api/admin/subscriptions — Activate a venue subscription
 * Body: { subscriptionId, action: 'activate' | 'reject' | 'contact' }
 *
 * activate: Creates venue (tier 3) + binds user + sends notification
 */
export async function POST(request: NextRequest) {
  const { isHQ, role, userId: adminUserId } = await verifyHQToken(request.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ['admin', 'owner']) || !adminUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { subscriptionId, action } = await request.json();
  if (!subscriptionId || !action) {
    return NextResponse.json({ error: 'Missing subscriptionId or action' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get subscription
  const { data: sub } = await supabase
    .from('venue_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();

  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

  if (action === 'contact') {
    await supabase
      .from('venue_subscriptions')
      .update({ status: 'contacted', processed_by: adminUserId, processed_at: new Date().toISOString() })
      .eq('id', subscriptionId);
    return NextResponse.json({ success: true });
  }

  if (action === 'reject') {
    await supabase
      .from('venue_subscriptions')
      .update({ status: 'rejected', processed_by: adminUserId, processed_at: new Date().toISOString() })
      .eq('id', subscriptionId);
    return NextResponse.json({ success: true });
  }

  if (action === 'activate') {
    // 1. Create venue
    const venueId = `ven_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { error: venueErr } = await supabase
      .from('venues')
      .insert({
        venue_id: venueId,
        display_name: sub.venue_name,
        address_local: sub.venue_address || null,
        tier: 3,
        verification_status: 'Claimed',
        status: 'active',
        data_source: 'user',
        setup_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (venueErr) {
      console.error('[activate] venue insert error:', venueErr.message);
      return NextResponse.json({ error: 'Failed to create venue' }, { status: 500 });
    }

    // 2. Bind user — update claimed_venue_ids + role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('claimed_venue_ids, role')
      .eq('id', sub.user_id)
      .single();

    const currentIds = userProfile?.claimed_venue_ids || [];
    const updatedIds = [...currentIds, venueId];
    const newRole = userProfile?.role === 'member' ? 'venue_manager' : userProfile?.role;

    await supabase
      .from('profiles')
      .update({ claimed_venue_ids: updatedIds, role: newRole })
      .eq('id', sub.user_id);

    // 3. Update subscription
    await supabase
      .from('venue_subscriptions')
      .update({
        status: 'approved',
        venue_id: venueId,
        processed_by: adminUserId,
        processed_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    // 4. Notify user
    await supabase.from('notifications').insert({
      user_id: sub.user_id,
      type: 'venue_activated',
      title: `🎉 Your venue "${sub.venue_name}" is now live!`,
      body: `Your Elite venue has been activated. Head to your dashboard to start setting up.`,
      reference_type: 'venue',
      reference_id: venueId,
      status: 'sent',
    });

    return NextResponse.json({ success: true, venueId });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
