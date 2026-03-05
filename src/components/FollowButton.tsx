'use client';

import { useAuth } from './AuthProvider';
import { useFavorites } from './FavoritesProvider';
import { useTranslations } from 'next-intl';

interface FollowButtonProps {
  itemType: 'artist' | 'venue';
  itemId: string;
  /** compact = icon-only for cards, full = icon + text for detail pages */
  variant?: 'compact' | 'full';
  /** Adds frosted glass backdrop — best for overlaying photos */
  glass?: boolean;
}

export default function FollowButton({ itemType, itemId, variant = 'compact', glass = false }: FollowButtonProps) {
  const { user, setShowAuthModal } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const t = useTranslations('common');

  const active = user ? isFavorite(itemType, itemId) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    toggleFavorite(itemType, itemId);
  };

  if (variant === 'compact') {
    const size = glass ? 'w-10 h-10' : 'w-8 h-8';
    const iconSize = glass ? 18 : 16;
    const glassBg = glass
      ? 'bg-black/40 backdrop-blur-md backdrop-saturate-150 shadow-lg border border-white/10'
      : '';

    return (
      <button
        onClick={handleClick}
        className={`group/fav flex items-center justify-center ${size} rounded-full transition-all duration-200 hover:bg-gold/10 ${glassBg}`}
        aria-label={active ? t('following') : t('follow')}
      >
        {active ? (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="text-gold drop-shadow-sm">
            <path d="M12 3c-1.023 0-2.047.351-2.89 1.054a4.642 4.642 0 00-1.634 3.03C5.572 7.33 4 9.01 4 11c0 1.09.254 2.413.572 3.614.319 1.206.735 2.382 1.089 3.22l.012.028c.178.42.341.799.515 1.105.09.159.198.322.335.466.136.143.34.317.627.394a1 1 0 00.58-.02c.273-.1.452-.294.574-.448.123-.155.226-.337.318-.518.183-.362.357-.814.544-1.31C9.86 15.847 11 14.5 12 14.5s2.14 1.347 2.834 3.031c.187.496.361.948.544 1.31.092.181.195.363.318.518.122.154.301.348.574.448a1 1 0 00.58.02c.287-.077.491-.251.627-.394.137-.144.246-.307.335-.466.174-.306.337-.685.515-1.105l.012-.028c.354-.838.77-2.014 1.089-3.22C19.746 13.413 20 12.09 20 11c0-1.99-1.572-3.67-3.476-3.916a4.642 4.642 0 00-1.635-3.03A4.164 4.164 0 0012 3z"/>
          </svg>
        ) : (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${glass ? 'text-white/80' : 'text-[#6A6560]'} group-hover/fav:text-gold transition-colors drop-shadow-sm`}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        )}
      </button>
    );
  }

  // Full variant for detail pages
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 shrink-0 ${
        active
          ? 'bg-gold/15 text-gold border border-gold/30'
          : 'border border-[var(--border)] text-[#8A8578] hover:text-gold hover:border-gold/30'
      }`}
    >
      {active ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gold">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      )}
      <span className="uppercase tracking-widest text-xs">{active ? t('following') : t('follow')}</span>
    </button>
  );
}
