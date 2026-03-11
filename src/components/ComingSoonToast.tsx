'use client';

import { useEffect } from 'react';
import { useAuth } from './AuthProvider';

export default function ComingSoonToast() {
  const { showComingSoon, setShowComingSoon } = useAuth();

  useEffect(() => {
    if (!showComingSoon) return;
    const timer = setTimeout(() => setShowComingSoon(false), 2500);
    return () => clearTimeout(timer);
  }, [showComingSoon, setShowComingSoon]);

  return (
    <div
      className="fixed bottom-8 left-1/2 z-[80]"
      style={{
        transform: `translateX(-50%) translateY(${showComingSoon ? '0' : '8px'})`,
        opacity: showComingSoon ? 1 : 0,
        pointerEvents: showComingSoon ? 'auto' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        className="px-6 py-3 rounded-2xl border border-[var(--border)] shadow-2xl text-sm font-medium tracking-wide whitespace-nowrap"
        style={{
          background: 'color-mix(in srgb, var(--background) 92%, transparent)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <span className="text-[var(--color-gold)]">Coming soon!</span>
      </div>
    </div>
  );
}
