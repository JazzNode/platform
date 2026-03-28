import { createAdminClient } from '@/utils/supabase/admin';
import type { TeamRole } from './team-auth';

interface ArtistVerifyResult {
  isAuthorized: boolean;
  userId: string | null;
  role: TeamRole | null;
}

/**
 * Verify a Bearer token and check if the user has access to the given artist.
 * Checks claimed_artist_ids first (backward compat), then falls back to team_members.
 */
export async function verifyArtistClaimToken(
  authHeader: string | null,
  artistId: string,
): Promise<ArtistVerifyResult> {
  if (!authHeader?.startsWith('Bearer ')) return { isAuthorized: false, userId: null, role: null };
  const token = authHeader.slice(7);

  try {
    const supabase = createAdminClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isAuthorized: false, userId: null, role: null };

    // Check legacy claimed_artist_ids first
    const { data: profile } = await supabase
      .from('profiles')
      .select('claimed_artist_ids')
      .eq('id', user.id)
      .single();

    const claimed = profile?.claimed_artist_ids ?? [];
    if (claimed.includes(artistId)) {
      // Look up role from team_members
      const { data: member } = await supabase
        .from('team_members')
        .select('role')
        .eq('entity_type', 'artist')
        .eq('entity_id', artistId)
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
      .eq('entity_type', 'artist')
      .eq('entity_id', artistId)
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
