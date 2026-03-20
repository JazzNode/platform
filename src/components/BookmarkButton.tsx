'use client';

import { useState, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { useFollows } from './FollowsProvider';
import { useTranslations } from 'next-intl';

interface BookmarkButtonProps {
  itemId: string;
  /** compact = icon-only for cards, full = icon + text for detail pages */
  variant?: 'compact' | 'full';
}

export default function BookmarkButton({ itemId, variant = 'compact' }: BookmarkButtonProps) {
  const { user, setShowAuthModal } = useAuth();
  const { isFollowing, toggleFollow } = useFollows();
  const t = useTranslations('common');
  const [animating, setAnimating] = useState<'pop' | 'unpop' | null>(null);
  const ringRef = useRef<HTMLSpanElement>(null);

  const active = user ? isFollowing('event', itemId) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const willActivate = !active;
    setAnimating(willActivate ? 'pop' : 'unpop');
    setTimeout(() => setAnimating(null), 500);

    toggleFollow('event', itemId);
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        className="group/fav flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:bg-gold/10 relative"
        aria-label={active ? t('bookmarked') : t('bookmark')}
      >
        {/* Gold ring burst on bookmark */}
        <span
          ref={ringRef}
          className="absolute inset-0 rounded-full border-2 border-gold pointer-events-none"
          style={{
            opacity: 0,
            ...(animating === 'pop' ? { animation: 'fav-ring 0.45s ease-out forwards' } : {}),
          }}
        />
        {/* Icon with pop/unpop animation */}
        <span
          className="inline-flex"
          style={animating ? { animation: `fav-${animating} 0.4s ease-out` } : undefined}
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
        </span>
      </button>
    );
  }

  // Full variant for detail pages
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 shrink-0 relative overflow-hidden ${
        active
          ? 'bg-gold/15 text-gold border border-gold/30'
          : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:text-gold hover:border-gold/30'
      }`}
      style={animating ? { animation: 'fav-btn-pop 0.4s ease-out' } : undefined}
    >
      {/* Shimmer sweep on bookmark */}
      {animating === 'pop' && (
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(var(--gold-rgb, 181 155 95), 0.2), transparent)',
            animation: 'fav-shimmer 0.5s ease-out forwards',
          }}
        />
      )}
      <span
        className="inline-flex"
        style={animating ? { animation: `fav-${animating} 0.4s ease-out` } : undefined}
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
      </span>
      <span className="uppercase tracking-widest text-xs relative">{active ? t('bookmarked') : t('bookmark')}</span>
    </button>
  );
}
