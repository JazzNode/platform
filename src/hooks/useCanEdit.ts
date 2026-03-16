import { useAdmin } from '@/components/AdminProvider';
import { useAuth } from '@/components/AuthProvider';

/**
 * Determines if the current user can edit a given entity.
 * Returns true for admins (with admin mode enabled) or claimed users.
 */
export function useCanEdit(entityType: 'artist' | 'venue', entityId: string) {
  const { isAdmin, token, getFreshToken, handleUnauthorized } = useAdmin();
  const { user, profile } = useAuth();

  const isClaimed = !!(
    user &&
    profile &&
    ((entityType === 'artist' && profile.claimed_artist_ids?.includes(entityId)) ||
      (entityType === 'venue' && profile.claimed_venue_ids?.includes(entityId)))
  );

  return {
    canEdit: isAdmin || isClaimed,
    isAdmin,
    isClaimed,
    token,
    getFreshToken,
    handleUnauthorized,
  };
}
