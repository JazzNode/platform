import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/artist/team?artistId=xxx
 * List all team members for an artist.
 */
export async function GET(request: NextRequest) {
  const artistId = request.nextUrl.searchParams.get('artistId');
  if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createAdminClient();

  // Verify caller has access
  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_artist_ids, role')
    .eq('id', user.id)
    .single();

  const isPlatformAdmin = ['admin', 'owner'].includes(profile?.role || '');
  const isClaimed = profile?.claimed_artist_ids?.includes(artistId);

  if (!isClaimed && !isPlatformAdmin) {
    const { data: membership } = await adminClient
      .from('team_members')
      .select('id')
      .eq('entity_type', 'artist')
      .eq('entity_id', artistId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get team members
  const { data: members } = await adminClient
    .from('team_members')
    .select('id, user_id, role, status, created_at')
    .eq('entity_type', 'artist')
    .eq('entity_id', artistId)
    .neq('status', 'removed')
    .order('created_at', { ascending: true });

  // Get billing_user_id
  const { data: artist } = await adminClient
    .from('artists')
    .select('billing_user_id')
    .eq('artist_id', artistId)
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
        is_billing: m.user_id === artist?.billing_user_id,
      };
    }),
  );

  return NextResponse.json({ members: enriched, billing_user_id: artist?.billing_user_id });
}

/**
 * POST /api/artist/team
 * Invite a team member by email.
 * Body: { artistId, email, role }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { artistId, email, role = 'editor' } = await request.json();
  if (!artistId || !email?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verify caller is owner or admin
  const { data: callerMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', 'artist')
    .eq('entity_id', artistId)
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
    .eq('entity_type', 'artist')
    .eq('entity_id', artistId)
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
        entity_type: 'artist',
        entity_id: artistId,
        user_id: targetUser.id,
        role,
        status: 'accepted',
        invited_by: user.id,
      });
  }

  // Backward compat: add to claimed_artist_ids
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('claimed_artist_ids, role')
    .eq('id', targetUser.id)
    .single();

  const currentIds = targetProfile?.claimed_artist_ids || [];
  if (!currentIds.includes(artistId)) {
    const newRole = targetProfile?.role === 'member' ? 'artist_manager' : targetProfile?.role;
    await adminClient
      .from('profiles')
      .update({ claimed_artist_ids: [...currentIds, artistId], role: newRole })
      .eq('id', targetUser.id);
  }

  return NextResponse.json({ success: true, userId: targetUser.id });
}

/**
 * PATCH /api/artist/team
 * Change a member's role.
 * Body: { artistId, userId, role }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { artistId, userId: targetUserId, role: newRole } = await request.json();
  if (!artistId || !targetUserId || !newRole) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  if (!['admin', 'editor', 'viewer'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role. Cannot assign owner via role change.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: callerMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', 'artist')
    .eq('entity_id', artistId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single();

  const isPlatformAdmin = await checkPlatformAdmin(adminClient, user.id);

  if (!isPlatformAdmin && (!callerMember || !['owner', 'admin'].includes(callerMember.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: targetMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', 'artist')
    .eq('entity_id', artistId)
    .eq('user_id', targetUserId)
    .eq('status', 'accepted')
    .single();

  if (!targetMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (targetMember.role === 'owner') return NextResponse.json({ error: 'Cannot change owner role. Use transfer ownership instead.' }, { status: 400 });

  if (newRole === 'admin' && callerMember?.role !== 'owner' && !isPlatformAdmin) {
    return NextResponse.json({ error: 'Only the owner can promote to admin.' }, { status: 403 });
  }

  await adminClient
    .from('team_members')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('entity_type', 'artist')
    .eq('entity_id', artistId)
    .eq('user_id', targetUserId)
    .eq('status', 'accepted');

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/artist/team
 * Remove a team member.
 * Body: { artistId, userId }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { artistId, userId: targetUserId } = await request.json();
  if (!artistId || !targetUserId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: callerMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', 'artist')
    .eq('entity_id', artistId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single();

  const isPlatformAdmin = await checkPlatformAdmin(adminClient, user.id);

  if (!isPlatformAdmin && (!callerMember || !['owner', 'admin'].includes(callerMember.role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: targetMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', 'artist')
    .eq('entity_id', artistId)
    .eq('user_id', targetUserId)
    .eq('status', 'accepted')
    .single();

  if (!targetMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (targetMember.role === 'owner') return NextResponse.json({ error: 'Cannot remove the owner. Transfer ownership first.' }, { status: 400 });

  if (targetMember.role === 'admin' && callerMember?.role !== 'owner' && !isPlatformAdmin) {
    return NextResponse.json({ error: 'Only the owner can remove admins.' }, { status: 403 });
  }

  await adminClient
    .from('team_members')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('entity_type', 'artist')
    .eq('entity_id', artistId)
    .eq('user_id', targetUserId);

  // Backward compat: remove from claimed_artist_ids
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('claimed_artist_ids')
    .eq('id', targetUserId)
    .single();

  const updated = (targetProfile?.claimed_artist_ids || []).filter((id: string) => id !== artistId);
  await adminClient
    .from('profiles')
    .update({ claimed_artist_ids: updated })
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
