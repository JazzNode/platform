'use client';

import { useState, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { useFollows } from './FollowsProvider';
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
  const { isFollowing, toggleFollow } = useFollows();
  const t = useTranslations('common');
  const [animating, setAnimating] = useState<'pop' | 'unpop' | null>(null);
  const ringRef = useRef<HTMLSpanElement>(null);

  const active = user ? isFollowing(itemType, itemId) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Trigger animation based on direction
    const willActivate = !active;
    setAnimating(willActivate ? 'pop' : 'unpop');
    setTimeout(() => setAnimating(null), 500);

    toggleFollow(itemType, itemId);
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
        className={`group/fav flex items-center justify-center ${size} rounded-full transition-all duration-200 hover:bg-gold/10 ${glassBg} relative`}
        aria-label={active ? t('following') : t('follow')}
      >
        {/* Gold ring burst on follow */}
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
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" className="text-gold drop-shadow-sm">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          ) : (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${glass ? 'text-white/80' : 'text-[#6A6560]'} group-hover/fav:text-gold transition-colors drop-shadow-sm`}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
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
          : 'border border-[var(--color-gold)]/25 text-[var(--color-gold-dim)] hover:text-gold hover:border-gold/40 hover:bg-gold/5'
      }`}
      style={animating ? { animation: 'fav-btn-pop 0.4s ease-out' } : undefined}
    >
      {/* Shimmer sweep on follow */}
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
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        )}
      </span>
      <span className="uppercase tracking-widest text-xs relative">{active ? t('following') : t('follow')}</span>
    </button>
  );
}
