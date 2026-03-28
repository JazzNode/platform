'use client';

import { useTranslations } from 'next-intl';
import FadeUp from '@/components/animations/FadeUp';

export default function VenueBillingPage() {
  const t = useTranslations('venueDashboard');

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('billingTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">{t('billingDescription')}</p>
      </FadeUp>
      <FadeUp>
        <div className="bg-gradient-to-br from-[var(--color-gold)]/5 to-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 rounded-2xl p-10 text-center">
          <p className="text-3xl mb-3">🎵</p>
          <h2 className="text-lg font-bold mb-2">Coming Soon</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Subscription management will be available here soon.</p>
        </div>
      </FadeUp>
    </div>
  );
}
