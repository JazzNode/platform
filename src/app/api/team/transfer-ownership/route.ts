import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * POST /api/team/transfer-ownership
 * Transfer entity ownership to another accepted team member.
 * Body: { entityType, entityId, newOwnerUserId }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { entityType, entityId, newOwnerUserId } = await request.json();
  if (!entityType || !entityId || !newOwnerUserId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!['artist', 'venue'].includes(entityType)) {
    return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 });
  }
  if (newOwnerUserId === user.id) {
    return NextResponse.json({ error: 'You are already the owner.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verify caller is current owner
  const { data: callerMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single();

  if (!callerMember || callerMember.role !== 'owner') {
    return NextResponse.json({ error: 'Only the current owner can transfer ownership.' }, { status: 403 });
  }

  // Verify target is an accepted member
  const { data: targetMember } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('user_id', newOwnerUserId)
    .eq('status', 'accepted')
    .single();

  if (!targetMember) {
    return NextResponse.json({ error: 'Target user is not an accepted team member.' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Demote current owner to admin
  await adminClient
    .from('team_members')
    .update({ role: 'admin', updated_at: now })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('user_id', user.id)
    .eq('status', 'accepted');

  // Promote new owner
  await adminClient
    .from('team_members')
    .update({ role: 'owner', updated_at: now })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('user_id', newOwnerUserId)
    .eq('status', 'accepted');

  // Update billing_user_id
  const table = entityType === 'artist' ? 'artists' : 'venues';
  const idColumn = entityType === 'artist' ? 'artist_id' : 'venue_id';
  await adminClient
    .from(table)
    .update({ billing_user_id: newOwnerUserId })
    .eq(idColumn, entityId);

  return NextResponse.json({ success: true });
}
