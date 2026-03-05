'use client';

import { useAuth } from './AuthProvider';
import { useFavorites } from './FavoritesProvider';
import { useTranslations } from 'next-intl';

interface BookmarkButtonProps {
  itemId: string;
  /** compact = icon-only for cards, full = icon + text for detail pages */
  variant?: 'compact' | 'full';
}

export default function BookmarkButton({ itemId, variant = 'compact' }: BookmarkButtonProps) {
  const { user, setShowAuthModal } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const t = useTranslations('common');

  const active = user ? isFavorite('event', itemId) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    toggleFavorite('event', itemId);
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className="group/fav flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:bg-gold/10"
        aria-label={active ? t('bookmarked') : t('bookmark')}
      >
        {active ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gold">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6A6560] group-hover/fav:text-gold transition-colors">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
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
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      )}
      <span className="uppercase tracking-widest text-xs">{active ? t('bookmarked') : t('bookmark')}</span>
    </button>
  );
}
