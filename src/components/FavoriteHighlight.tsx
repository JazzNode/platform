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
      className="transition-all duration-500"
      style={active ? {
        background: 'linear-gradient(180deg, rgba(var(--theme-glow-rgb), 0.06) 0%, rgba(var(--theme-glow-rgb), 0.02) 40%, transparent 100%)',
      } : undefined}
    >
      {children}
    </div>
  );
}
