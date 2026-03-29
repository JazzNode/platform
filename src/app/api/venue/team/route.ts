import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/venue/team?venueId=xxx
 * List all team members for a venue.
 */
export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venueId');
  if (!venueId) return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createAdminClient();

  // Verify caller has access (claimed_venue_ids OR team_members OR platform admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isPlatformAdmin = ['admin', 'owner', 'editor'].includes(profile?.role || '');
  const isClaimed = profile?.claimed_venue_ids?.includes(venueId);

  if (!isClaimed && !isPlatformAdmin) {
    const { data: membership } = await adminClient
      .from('team_members')
      .select('id')
      .eq('entity_type', 'venue')
      .eq('entity_id', venueId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get team members
  const { data: members } = await adminClient
    .from('team_members')
    .select('id, user_id, role, status, created_at')
    .eq('entity_type', 'venue')
    .eq('entity_id', venueId)
    .neq('status', 'removed')
    .order('created_at', { ascending: true });

  // Get billing_user_id
  const { data: venue } = await adminClient
    .from('venues')
    .select('billing_user_id')
    .eq('venue_id', venueId)
    .single();

  // Enrich with profile data
  const enriched = await Promise.all(
    (members || []).map(async (m) => {
      const { data: memberProfile } = await adminClient
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('id', m.user_id)
        .single();
      const { data: authUser } = await adminClient.auth.admin.getUserById(m.user_id);
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        display_name: memberProfile?.display_name,
        avatar_url: memberProfile?.avatar_url,
        email: authUser?.user?.email || null,
        is_billing: m.user_id === venue?.billing_user_id,
      };
    }),
  );

  return NextResponse.json({ members: enriched, billing_user_id: venue?.billing_user_id });
}

/**
 * POST /api/venue/team
 * Invite a team member by email.
 * Body: { venueId, email, role }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { venueId, email, role = 'editor' } = await request.json();
  if (!venueId || !email?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verify caller is owner or admin
  const { data: callerMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', 'venue')
    .eq('entity_id', venueId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single();

  const isPlatformAdmin = await checkPlatformAdmin(adminClient, user.id);

  if (!isPlatformAdmin && (!callerMember || !['owner', 'admin'].includes(callerMember.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only owner can invite admins
  if (role === 'admin' && callerMember?.role !== 'owner' && !isPlatformAdmin) {
    return NextResponse.json({ error: 'Only the owner can invite admins.' }, { status: 403 });
  }

  // Find user by email
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  const targetUser = (users || []).find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found. They must register a JazzNode account first.' }, { status: 404 });
  }

  // Check if already a member
  const { data: existing } = await adminClient
    .from('team_members')
    .select('id, status')
    .eq('entity_type', 'venue')
    .eq('entity_id', venueId)
    .eq('user_id', targetUser.id)
    .single();

  if (existing && existing.status !== 'removed') {
    return NextResponse.json({ error: 'This user is already a team member.' }, { status: 409 });
  }

  // Upsert team member
  if (existing) {
    await adminClient
      .from('team_members')
      .update({ role, status: 'accepted', invited_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await adminClient
      .from('team_members')
      .insert({
        entity_type: 'venue',
        entity_id: venueId,
        user_id: targetUser.id,
        role,
        status: 'accepted',
        invited_by: user.id,
      });
  }

  // Backward compat: add to claimed_venue_ids
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', targetUser.id)
    .single();

  const currentIds = targetProfile?.claimed_venue_ids || [];
  if (!currentIds.includes(venueId)) {
    const newRole = targetProfile?.role === 'member' ? 'venue_manager' : targetProfile?.role;
    await adminClient
      .from('profiles')
      .update({ claimed_venue_ids: [...currentIds, venueId], role: newRole })
      .eq('id', targetUser.id);
  }

  return NextResponse.json({ success: true, userId: targetUser.id });
}

/**
 * PATCH /api/venue/team
 * Change a member's role.
 * Body: { venueId, userId, role }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { venueId, userId: targetUserId, role: newRole } = await request.json();
  if (!venueId || !targetUserId || !newRole) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (!['admin', 'editor', 'viewer'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role. Cannot assign owner via role change.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verify caller
  const { data: callerMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', 'venue')
    .eq('entity_id', venueId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single();

  const isPlatformAdmin = await checkPlatformAdmin(adminClient, user.id);

  if (!isPlatformAdmin && (!callerMember || !['owner', 'admin'].includes(callerMember.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Can't change owner's role
  const { data: targetMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', 'venue')
    .eq('entity_id', venueId)
    .eq('user_id', targetUserId)
    .eq('status', 'accepted')
    .single();

  if (!targetMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (targetMember.role === 'owner') return NextResponse.json({ error: 'Cannot change owner role. Use transfer ownership instead.' }, { status: 400 });

  // Admin can't promote to admin
  if (newRole === 'admin' && callerMember?.role !== 'owner' && !isPlatformAdmin) {
    return NextResponse.json({ error: 'Only the owner can promote to admin.' }, { status: 403 });
  }

  await adminClient
    .from('team_members')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('entity_type', 'venue')
    .eq('entity_id', venueId)
    .eq('user_id', targetUserId)
    .eq('status', 'accepted');

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/venue/team
 * Remove a team member.
 * Body: { venueId, userId }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { venueId, userId: targetUserId } = await request.json();
  if (!venueId || !targetUserId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verify caller is owner or admin
  const { data: callerMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', 'venue')
    .eq('entity_id', venueId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single();

  const isPlatformAdmin = await checkPlatformAdmin(adminClient, user.id);

  if (!isPlatformAdmin && (!callerMember || !['owner', 'admin'].includes(callerMember.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Can't remove owner
  const { data: targetMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', 'venue')
    .eq('entity_id', venueId)
    .eq('user_id', targetUserId)
    .eq('status', 'accepted')
    .single();

  if (!targetMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (targetMember.role === 'owner') return NextResponse.json({ error: 'Cannot remove the owner. Transfer ownership first.' }, { status: 400 });

  // Admin can't remove another admin (only owner can)
  if (targetMember.role === 'admin' && callerMember?.role !== 'owner' && !isPlatformAdmin) {
    return NextResponse.json({ error: 'Only the owner can remove admins.' }, { status: 403 });
  }

  // Mark as removed
  await adminClient
    .from('team_members')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('entity_type', 'venue')
    .eq('entity_id', venueId)
    .eq('user_id', targetUserId);

  // Backward compat: remove from claimed_venue_ids
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('claimed_venue_ids')
    .eq('id', targetUserId)
    .single();

  const updated = (targetProfile?.claimed_venue_ids || []).filter((id: string) => id !== venueId);
  await adminClient
    .from('profiles')
    .update({ claimed_venue_ids: updated })
    .eq('id', targetUserId);

  return NextResponse.json({ success: true });
}

async function checkPlatformAdmin(adminClient: ReturnType<typeof createAdminClient>, userId: string): Promise<boolean> {
  const { data } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return ['admin', 'owner'].includes(data?.role || '');
}
