import { createAdminClient } from '@/utils/supabase/admin';

interface AdminVerifyResult {
  isAdmin: boolean;
  userId: string | null;
}

/**
 * Verify an admin Bearer token from request headers.
 * Uses Supabase auth to identify the user, then checks profiles.role.
 * Returns isAdmin flag and userId (for audit logging).
 */
export async function verifyAdminToken(authHeader: string | null): Promise<AdminVerifyResult> {
  if (!authHeader?.startsWith('Bearer ')) return { isAdmin: false, userId: null };
  const token = authHeader.slice(7);

  try {
    const supabase = createAdminClient();

    // Verify the Supabase access token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isAdmin: false, userId: null };

    // Check profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return {
      isAdmin: profile?.role === 'admin' || profile?.role === 'owner',
      userId: user.id,
    };
  } catch {
    return { isAdmin: false, userId: null };
  }
}

interface OwnerVerifyResult {
  isOwner: boolean;
  userId: string | null;
}

/**
 * Verify that the caller has the 'owner' role (highest privilege).
 * Only owners can promote/demote admin roles.
 */
export async function verifyOwnerToken(authHeader: string | null): Promise<OwnerVerifyResult> {
  if (!authHeader?.startsWith('Bearer ')) return { isOwner: false, userId: null };
  const token = authHeader.slice(7);

  try {
    const supabase = createAdminClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isOwner: false, userId: null };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return {
      isOwner: profile?.role === 'owner',
      userId: user.id,
    };
  } catch {
    return { isOwner: false, userId: null };
  }
}
