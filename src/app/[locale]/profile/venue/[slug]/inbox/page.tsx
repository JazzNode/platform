'use client';

import { useTranslations } from 'next-intl';
import FadeUp from '@/components/animations/FadeUp';

export default function VenueInboxPage() {
  const t = useTranslations('venueDashboard');

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('inbox')}</h1>
      </FadeUp>

      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center">
          <svg className="w-16 h-16 text-[var(--muted-foreground)]/20 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
          <p className="text-sm text-[var(--muted-foreground)]">{t('inboxPlaceholder')}</p>
          <span className="inline-block mt-3 text-xs text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-3 py-1 rounded-full font-semibold">
            {t('comingSoon')}
          </span>
        </div>
      </FadeUp>
    </div>
  );
}
