'use client';

import { useAuth } from './AuthProvider';
import { useFollows } from './FollowsProvider';

interface FavoriteHighlightProps {
  itemType: 'artist' | 'venue' | 'event';
  itemId: string;
  children: React.ReactNode;
}

/**
 * Wraps detail page content with a subtle theme-colored background tint
 * when the current user has followed/bookmarked the item.
 */
export default function FavoriteHighlight({ itemType, itemId, children }: FavoriteHighlightProps) {
  const { user } = useAuth();
  const { isFollowing } = useFollows();
  const active = user ? isFollowing(itemType, itemId) : false;

  return (
    <div
      className={`transition-all duration-500 ${
        active ? 'rounded-3xl p-4 sm:p-6 -mx-4 sm:-mx-6 -my-4 sm:-my-6 overflow-x-hidden' : ''
      }`}
      style={active ? {
        background: 'rgba(var(--theme-glow-rgb), 0.04)',
        border: '1px solid rgba(var(--theme-glow-rgb), 0.08)',
      } : undefined}
    >
      {children}
    </div>
  );
}
