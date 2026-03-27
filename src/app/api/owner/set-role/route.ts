import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { writeAuditLog } from '@/lib/audit-log';

const ALLOWED_ROLES = ['member', 'artist_manager', 'venue_manager', 'editor', 'moderator', 'marketing', 'admin'] as const;

/**
 * PATCH /api/owner/set-role — Owner-only: set a member's role
 * Body: { userId: string, role: 'member' | 'artist_manager' | 'venue_manager' | 'admin' }
 *
 * Only the owner can use this endpoint. Cannot set someone to 'owner'.
 * Cannot change own role.
 */
export async function PATCH(request: NextRequest) {
  const { isOwner, userId: ownerUserId } = await verifyOwnerToken(
    request.headers.get('authorization'),
  );
  if (!isOwner || !ownerUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, role } = body as { userId?: string; role?: string };

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
  }

  if (!ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}` }, { status: 400 });
  }

  // Cannot change own role
  if (userId === ownerUserId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify target user exists and is not owner
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (targetProfile.role === 'owner') {
    return NextResponse.json({ error: 'Cannot modify another owner' }, { status: 403 });
  }

  // Update role
  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  writeAuditLog({
    adminUserId: ownerUserId,
    action: 'owner_set_role',
    entityType: 'profile',
    entityId: userId,
    details: { previousRole: targetProfile.role, newRole: role },
    ipAddress: request.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ success: true, userId, role });
}
