import { createAdminClient } from '@/utils/supabase/admin';

interface ArtistVerifyResult {
  isAuthorized: boolean;
  userId: string | null;
}

/**
 * Verify a Bearer token and check if the user has claimed the given artist.
 * Returns isAuthorized if the user's claimed_artist_ids includes the artistId.
 */
export async function verifyArtistClaimToken(
  authHeader: string | null,
  artistId: string,
): Promise<ArtistVerifyResult> {
  if (!authHeader?.startsWith('Bearer ')) return { isAuthorized: false, userId: null };
  const token = authHeader.slice(7);

  try {
    const supabase = createAdminClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return { isAuthorized: false, userId: null };

    const { data: profile } = await supabase
      .from('profiles')
      .select('claimed_artist_ids')
      .eq('id', user.id)
      .single();

    const claimed = profile?.claimed_artist_ids ?? [];
    return {
      isAuthorized: claimed.includes(artistId),
      userId: user.id,
    };
  } catch {
    return { isAuthorized: false, userId: null };
  }
}
