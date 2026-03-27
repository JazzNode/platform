import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/venue/team?venueId=xxx
 * List all managers (profiles with this venue in claimed_venue_ids).
 */
export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venueId');
  if (!venueId) return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify caller is a manager of this venue
  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const adminClient = createAdminClient();
  const { data: managers } = await adminClient
    .from('profiles')
    .select('id, display_name, username, avatar_url, email:id')
    .contains('claimed_venue_ids', [venueId]);

  // Get emails from auth.users
  const enriched = await Promise.all(
    (managers || []).map(async (m) => {
      const { data: authUser } = await adminClient.auth.admin.getUserById(m.id);
      return {
        id: m.id,
        display_name: m.display_name,
        username: m.username,
        avatar_url: m.avatar_url,
        email: authUser?.user?.email || null,
      };
    }),
  );

  return NextResponse.json({ managers: enriched });
}

/**
 * POST /api/venue/team
 * Add a manager by email.
 * Body: { venueId, email }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { venueId, email } = await request.json();
  if (!venueId || !email?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  // Verify caller
  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Check tier (Elite only)
  const adminClient = createAdminClient();
  const { data: venue } = await adminClient
    .from('venues')
    .select('tier')
    .eq('venue_id', venueId)
    .single();
  if (!isAdmin && (!venue || (venue.tier ?? 0) < 3)) {
    return NextResponse.json({ error: 'Elite tier required' }, { status: 403 });
  }

  // Find user by email
  const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
  const targetUser = (users || []).find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found. They must register a JazzNode account first.' }, { status: 404 });
  }

  // Check if already a manager
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', targetUser.id)
    .single();

  if (targetProfile?.claimed_venue_ids?.includes(venueId)) {
    return NextResponse.json({ error: 'This user is already a manager of this venue.' }, { status: 409 });
  }

  // Add to claimed_venue_ids
  const currentIds = targetProfile?.claimed_venue_ids || [];
  const newRole = targetProfile?.role === 'member' ? 'venue_manager' : targetProfile?.role;
  await adminClient
    .from('profiles')
    .update({ claimed_venue_ids: [...currentIds, venueId], role: newRole })
    .eq('id', targetUser.id);

  return NextResponse.json({ success: true, userId: targetUser.id });
}

/**
 * DELETE /api/venue/team
 * Remove a manager.
 * Body: { venueId, userId }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { venueId, userId: targetUserId } = await request.json();
  if (!venueId || !targetUserId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  // Can't remove yourself
  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 400 });
  }

  // Verify caller
  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const adminClient = createAdminClient();

  // Check at least 1 manager remains
  const { data: allManagers } = await adminClient
    .from('profiles')
    .select('id')
    .contains('claimed_venue_ids', [venueId]);
  if ((allManagers || []).length <= 1) {
    return NextResponse.json({ error: 'Cannot remove the last manager.' }, { status: 400 });
  }

  // Remove from claimed_venue_ids
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
