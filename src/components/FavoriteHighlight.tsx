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
      className={`transition-all duration-700 ${active ? 'rounded-3xl' : ''}`}
      style={active ? {
        background: 'rgba(var(--theme-glow-rgb), 0.04)',
      } : undefined}
    >
      {children}
    </div>
  );
}
