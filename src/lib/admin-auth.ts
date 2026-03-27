import { createAdminClient } from '@/utils/supabase/admin';

/** All roles that can access JazzNode HQ */
export const HQ_ROLES = ['editor', 'moderator', 'marketing', 'admin', 'owner'] as const;
export type HQRole = (typeof HQ_ROLES)[number];

export interface HQVerifyResult {
  isHQ: boolean;
  role: string | null;
  userId: string | null;
}

/**
 * Check if a role string has permission against an allowed list.
 */
export function hasPermission(role: string | null, allowed: string[]): boolean {
  return role !== null && allowed.includes(role);
}

/**
 * Verify a Bearer token and check if the user has any HQ role.
 * Returns the actual role string for granular permission checks.
 */
export async function verifyHQToken(authHeader: string | null): Promise<HQVerifyResult> {
  if (!authHeader?.startsWith('Bearer ')) return { isHQ: false, role: null, userId: null };
  const token = authHeader.slice(7);

  try {
    const supabase = createAdminClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isHQ: false, role: null, userId: null };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || null;
    return {
      isHQ: role !== null && (HQ_ROLES as readonly string[]).includes(role),
      role,
      userId: user.id,
    };
  } catch {
    return { isHQ: false, role: null, userId: null };
  }
}

interface AdminVerifyResult {
  isAdmin: boolean;
  userId: string | null;
}

/**
 * Verify an admin Bearer token from request headers.
 * Returns isAdmin flag (true for admin or owner only).
 * @deprecated Use verifyHQToken + hasPermission for granular checks.
 */
export async function verifyAdminToken(authHeader: string | null): Promise<AdminVerifyResult> {
  const { role, userId } = await verifyHQToken(authHeader);
  return {
    isAdmin: role === 'admin' || role === 'owner',
    userId,
  };
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
