'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

export default function VenueBookingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase.from('venues').select('tier').eq('venue_id', slug).single()
      .then(({ data }) => {
        if (data) setTier(data.tier);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (tier < 2) {
    return (
      <div className="space-y-6">
        <FadeUp>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('bookings')}</h1>
        </FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-[var(--color-gold)]/5 to-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-[var(--color-gold)]/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('bookingsLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">
              {t('bookingsLockedDesc')}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mb-6">
              {t('premiumLockedHint')}
            </p>
            <button onClick={() => alert(t('comingSoon') || 'Coming Soon')} className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {t('upgradePremium')}
            </button>
          </div>
        </FadeUp>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('bookings')}</h1>
      </FadeUp>
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
                {t('bookings')}
              </h2>
            </div>
            <span className="text-xs text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-3 py-1 rounded-full font-semibold">
              {t('comingSoon')}
            </span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
            {t('bookingsPlaceholder')}
          </p>
        </div>
      </FadeUp>
    </div>
  );
}
