'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';

export default function ComingSoonToast() {
  const { showComingSoon, setShowComingSoon } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [nudge, setNudge] = useState<'left' | 'right' | null>(null);

  // Auto-dismiss
  useEffect(() => {
    if (!showComingSoon) return;
    const timer = setTimeout(() => setShowComingSoon(null), 2500);
    return () => clearTimeout(timer);
  }, [showComingSoon, setShowComingSoon]);

  // Clamp to viewport so it doesn't overflow off-screen
  useEffect(() => {
    if (!showComingSoon || !ref.current) { setNudge(null); return; }
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    if (rect.left < 8) setNudge('right');
    else if (rect.right > window.innerWidth - 8) setNudge('left');
    else setNudge(null);
  }, [showComingSoon]);

  const visible = !!showComingSoon;
  const x = showComingSoon?.x ?? 0;
  const y = showComingSoon?.y ?? 0;

  return (
    <div
      ref={ref}
      className="fixed z-[80]"
      style={{
        left: x,
        top: y,
        transform: `translateX(${nudge === 'left' ? '-90%' : nudge === 'right' ? '-10%' : '-50%'}) translateY(calc(-100% - 10px)) translateY(${visible ? '0' : '6px'})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        className="px-4 py-2 rounded-xl border border-[var(--border)] shadow-2xl text-sm font-medium tracking-wide whitespace-nowrap"
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
