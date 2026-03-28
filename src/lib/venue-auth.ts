import { createAdminClient } from '@/utils/supabase/admin';
import type { TeamRole } from './team-auth';

interface VenueVerifyResult {
  isAuthorized: boolean;
  userId: string | null;
  role: TeamRole | null;
}

/**
 * Verify a Bearer token and check if the user has access to the given venue.
 * Checks claimed_venue_ids first (backward compat), then falls back to team_members.
 */
export async function verifyVenueClaimToken(
  authHeader: string | null,
  venueId: string,
): Promise<VenueVerifyResult> {
  if (!authHeader?.startsWith('Bearer ')) return { isAuthorized: false, userId: null, role: null };
  const token = authHeader.slice(7);

  try {
    const supabase = createAdminClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isAuthorized: false, userId: null, role: null };

    // Check legacy claimed_venue_ids first
    const { data: profile } = await supabase
      .from('profiles')
      .select('claimed_venue_ids')
      .eq('id', user.id)
      .single();

    const claimed = profile?.claimed_venue_ids ?? [];
    if (claimed.includes(venueId)) {
      const { data: member } = await supabase
        .from('team_members')
        .select('role')
        .eq('entity_type', 'venue')
        .eq('entity_id', venueId)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .single();

      return {
        isAuthorized: true,
        userId: user.id,
        role: (member?.role as TeamRole) ?? 'owner',
      };
    }

    // Fallback: check team_members table
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('entity_type', 'venue')
      .eq('entity_id', venueId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (member) {
      return {
        isAuthorized: true,
        userId: user.id,
        role: member.role as TeamRole,
      };
    }

    return { isAuthorized: false, userId: user.id, role: null };
  } catch {
    return { isAuthorized: false, userId: null, role: null };
  }
}
