'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Pull-to-refresh for PWA standalone mode (iOS doesn't support native pull-to-refresh).
 * Only activates when:
 * 1. Running in standalone (PWA) mode
 * 2. Page is scrolled to top
 * 3. User pulls down with touch gesture
 */
export default function PullToRefresh() {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isActive = useRef(false);

  const THRESHOLD = 80; // px to pull before triggering refresh

  const isStandalone = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }, []);

  useEffect(() => {
    if (!isStandalone()) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        startY.current = e.touches[0].clientY;
        isActive.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isActive.current) return;
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      if (distance > 0 && window.scrollY <= 0) {
        // Apply diminishing returns for a natural feel
        const dampened = Math.min(distance * 0.4, THRESHOLD * 1.5);
        setPullDistance(dampened);
        setPulling(true);

        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isActive.current) return;
      isActive.current = false;

      if (pullDistance >= THRESHOLD) {
        // Trigger refresh
        setPullDistance(THRESHOLD);
        window.location.reload();
      } else {
        setPulling(false);
        setPullDistance(0);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isStandalone, pullDistance]);

  if (!pulling) return null;

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = progress * 360;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        transform: `translateY(${pullDistance}px)`,
        transition: pulling ? 'none' : 'transform 0.3s ease-out',
        opacity: progress,
      }}
    >
      <div className="mt-2 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--card)] border border-[var(--border)] shadow-lg">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: `rotate(${rotation}deg)`, transition: pulling ? 'none' : 'transform 0.3s' }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    </div>
  );
}
