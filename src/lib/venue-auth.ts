import { createAdminClient } from '@/utils/supabase/admin';

interface VenueVerifyResult {
  isAuthorized: boolean;
  userId: string | null;
}

/**
 * Verify a Bearer token and check if the user has claimed the given venue.
 * Returns isAuthorized if the user's claimed_venue_ids includes the venueId.
 */
export async function verifyVenueClaimToken(
  authHeader: string | null,
  venueId: string,
): Promise<VenueVerifyResult> {
  if (!authHeader?.startsWith('Bearer ')) return { isAuthorized: false, userId: null };
  const token = authHeader.slice(7);

  try {
    const supabase = createAdminClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isAuthorized: false, userId: null };

    const { data: profile } = await supabase
      .from('profiles')
      .select('claimed_venue_ids')
      .eq('id', user.id)
      .single();

    const claimed = profile?.claimed_venue_ids ?? [];
    return {
      isAuthorized: claimed.includes(venueId),
      userId: user.id,
    };
  } catch {
    return { isAuthorized: false, userId: null };
  }
}
