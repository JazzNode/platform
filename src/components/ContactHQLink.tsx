'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

/**
 * Inline link that opens the HQ inbox (logged-in) or auth modal (logged-out).
 * Drop-in replacement for <a href="mailto:…"> in legal pages.
 */
export default function ContactHQLink({ children, onNavigate }: { children: React.ReactNode; onNavigate?: () => void }) {
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();

  const handleClick = useCallback(() => {
    if (user) {
      onNavigate?.();
      router.push(`/${locale}/profile/inbox?contactHQ=1`);
    } else {
      // For guests, fall back to email since we can't show the modal from here
      window.location.href = 'mailto:hello@jazznode.com';
    }
  }, [locale, router, user, onNavigate]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2 cursor-pointer"
    >
      {children}
    </button>
  );
}
