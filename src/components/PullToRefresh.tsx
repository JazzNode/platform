'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Silky pull-to-refresh for PWA standalone mode.
 * Uses refs + rAF for 60fps — no React re-renders during gesture.
 */

const THRESHOLD = 90;
const MAX_PULL = 140;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Rubber-band damping curve (like iOS) */
function dampen(distance: number): number {
  if (distance <= 0) return 0;
  // Logarithmic curve: fast at start, slows down
  const d = Math.min(distance, 300);
  return MAX_PULL * (1 - Math.exp(-d / 160));
}

export default function PullToRefresh() {
  const containerRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const startY = useRef(0);
  const currentDistance = useRef(0);
  const isActive = useRef(false);
  const isRefreshing = useRef(false);
  const rafId = useRef(0);

  const updateVisuals = useCallback(() => {
    const el = containerRef.current;
    const spinner = spinnerRef.current;
    const arrow = arrowRef.current;
    if (!el || !spinner || !arrow) return;

    const d = currentDistance.current;
    const dampened = dampen(d);
    const progress = Math.min(dampened / THRESHOLD, 1);
    const pastThreshold = dampened >= THRESHOLD;

    // Container position
    el.style.transform = `translateY(${dampened}px)`;
    el.style.opacity = String(Math.min(progress * 1.5, 1));

    // Spinner scale + shadow
    const scale = 0.5 + progress * 0.5;
    spinner.style.transform = `scale(${scale})`;
    spinner.style.boxShadow = pastThreshold
      ? '0 2px 20px rgba(200, 168, 78, 0.3)'
      : '0 2px 8px rgba(0,0,0,0.3)';
    spinner.style.borderColor = pastThreshold
      ? 'rgba(200, 168, 78, 0.4)'
      : 'var(--border)';

    // Arrow rotation
    const rotation = progress * 540; // 1.5 full turns
    arrow.style.transform = `rotate(${rotation}deg)`;
  }, []);

  useEffect(() => {
    if (!isStandalone()) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && !isRefreshing.current) {
        startY.current = e.touches[0].clientY;
        isActive.current = true;

        // Remove spring transition during gesture
        const el = containerRef.current;
        if (el) el.style.transition = 'none';
        const spinner = spinnerRef.current;
        if (spinner) spinner.style.transition = 'transform 0.1s ease-out, box-shadow 0.2s, border-color 0.2s';
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isActive.current) return;
      const distance = e.touches[0].clientY - startY.current;

      if (distance > 0 && window.scrollY <= 0) {
        currentDistance.current = distance;
        if (distance > 10) e.preventDefault();

        // Show container
        const el = containerRef.current;
        if (el) el.style.display = 'flex';

        cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(updateVisuals);
      } else {
        currentDistance.current = 0;
      }
    };

    const handleTouchEnd = () => {
      if (!isActive.current) return;
      isActive.current = false;

      const dampened = dampen(currentDistance.current);
      const el = containerRef.current;
      const spinner = spinnerRef.current;
      const arrow = arrowRef.current;

      if (dampened >= THRESHOLD && !isRefreshing.current) {
        // Trigger refresh with hold animation
        isRefreshing.current = true;

        if (el) {
          el.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
          el.style.transform = `translateY(${THRESHOLD}px)`;
        }
        if (spinner) {
          spinner.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
          spinner.style.transform = 'scale(1)';
        }
        if (arrow) {
          arrow.classList.add('animate-spin');
        }

        // Reload after a brief visual pause
        setTimeout(() => window.location.reload(), 600);
      } else {
        // Spring back
        currentDistance.current = 0;
        if (el) {
          el.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease';
          el.style.transform = 'translateY(0px)';
          el.style.opacity = '0';
        }
        if (spinner) {
          spinner.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
          spinner.style.transform = 'scale(0.3)';
        }

        // Hide after animation
        setTimeout(() => {
          if (el) el.style.display = 'none';
        }, 500);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(rafId.current);
    };
  }, [updateVisuals]);

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
      style={{
        display: 'none',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        opacity: 0,
        transform: 'translateY(0px)',
        willChange: 'transform, opacity',
      }}
    >
      <div
        ref={spinnerRef}
        className="mt-3 w-9 h-9 flex items-center justify-center rounded-full bg-[var(--card)] border border-[var(--border)]"
        style={{
          transform: 'scale(0.3)',
          willChange: 'transform',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <svg
          ref={arrowRef}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ willChange: 'transform' }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
      </div>
    </div>
  );
}
