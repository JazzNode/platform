'use client';

import { useTranslations } from 'next-intl';
import FadeUp from '@/components/animations/FadeUp';

export default function VenueBacklinePage() {
  const t = useTranslations('venueDashboard');

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('backline')}</h1>
      </FadeUp>

      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center">
          <svg className="w-16 h-16 text-[var(--muted-foreground)]/20 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 19V6l12-3v13M9 19c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2zm12-3c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2z" />
          </svg>
          <p className="text-sm text-[var(--muted-foreground)]">{t('backlinePlaceholder')}</p>
          <span className="inline-block mt-3 text-xs text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-3 py-1 rounded-full font-semibold">
            {t('comingSoon')}
          </span>
        </div>
      </FadeUp>
    </div>
  );
}
