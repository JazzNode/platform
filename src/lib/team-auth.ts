import { createAdminClient } from '@/utils/supabase/admin';

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

interface TeamVerifyResult {
  isAuthorized: boolean;
  userId: string | null;
  role: TeamRole | null;
}

/**
 * Verify a Bearer token and check if the user is an accepted team member
 * for the given entity. Optionally restrict to specific roles.
 */
export async function verifyTeamMembership(
  authHeader: string | null,
  entityType: 'artist' | 'venue',
  entityId: string,
  requiredRoles?: TeamRole[],
): Promise<TeamVerifyResult> {
  if (!authHeader?.startsWith('Bearer ')) return { isAuthorized: false, userId: null, role: null };
  const token = authHeader.slice(7);

  try {
    const supabase = createAdminClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isAuthorized: false, userId: null, role: null };

    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (!member) return { isAuthorized: false, userId: user.id, role: null };

    const role = member.role as TeamRole;
    const isAuthorized = requiredRoles ? requiredRoles.includes(role) : true;

    return { isAuthorized, userId: user.id, role };
  } catch {
    return { isAuthorized: false, userId: null, role: null };
  }
}
