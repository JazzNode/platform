'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthProvider';

export default function ComingSoonToast() {
  const { showComingSoon, setShowComingSoon } = useAuth();
  const t = useTranslations('common');
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Animate in, then auto-dismiss
  useEffect(() => {
    if (!showComingSoon) {
      setVisible(false);
      return;
    }
    // Trigger enter animation on next frame
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setShowComingSoon(null), 300);
    }, 2500);
    return () => clearTimeout(timer);
  }, [showComingSoon, setShowComingSoon]);

  if (!showComingSoon) return null;

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-8 z-[80] flex justify-center pointer-events-none"
    >
      <div
        className="pointer-events-auto px-5 py-3 rounded-2xl border border-[var(--color-gold)]/20 shadow-2xl flex items-center gap-2.5"
        style={{
          background: 'color-mix(in srgb, var(--background) 94%, var(--color-gold))',
          backdropFilter: 'blur(24px)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <svg className="w-4 h-4 text-[var(--color-gold)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="text-sm font-medium text-[var(--foreground)]">
          {t('premiumComingSoon')}
        </span>
        <button
          onClick={() => { setVisible(false); setTimeout(() => setShowComingSoon(null), 300); }}
          className="ml-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
