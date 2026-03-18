import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { writeAuditLog } from '@/lib/audit-log';

/**
 * DELETE /api/owner/delete-member — Owner-only: delete a member account
 * Body: { userId: string }
 *
 * Deletes the user's profile and their Supabase auth account.
 * Cannot delete self (owner) or another owner.
 */
export async function DELETE(request: NextRequest) {
  const { isOwner, userId: ownerUserId } = await verifyOwnerToken(
    request.headers.get('authorization'),
  );
  if (!isOwner || !ownerUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { userId } = body as { userId?: string };

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // Cannot delete self
  if (userId === ownerUserId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify target user exists and is not owner
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, role, display_name, username, email:id')
    .eq('id', userId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (targetProfile.role === 'owner') {
    return NextResponse.json({ error: 'Cannot delete another owner' }, { status: 403 });
  }

  // Get email for audit log before deletion
  const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(userId);
  const targetEmail = targetUser?.email || null;

  // Delete profile first (FK constraint: profiles.id -> auth.users.id)
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Delete the auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    // Profile already deleted but auth user deletion failed — log this
    console.error(`Failed to delete auth user ${userId}:`, authError.message);
    // Still return success since profile is gone, but note the issue
  }

  // Audit log
  writeAuditLog({
    adminUserId: ownerUserId,
    action: 'owner_delete_member',
    entityType: 'profile',
    entityId: userId,
    details: {
      deletedUsername: targetProfile.username,
      deletedDisplayName: targetProfile.display_name,
      deletedEmail: targetEmail,
      deletedRole: targetProfile.role,
    },
    ipAddress: request.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ success: true, userId });
}
