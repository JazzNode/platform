'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import FadeUp from '@/components/animations/FadeUp';

export default function ForVenuesPage() {
  const t = useTranslations('forVenues');
  const locale = useLocale();
  const { profile, loading } = useAuth();

  // Owner-only gate
  if (!loading && profile?.role !== 'owner' && profile?.role !== 'admin') {
    return null;
  }

  const features = [
    { icon: '💳', title: t('feat1Title'), desc: t('feat1Desc') },
    { icon: '🎯', title: t('feat2Title'), desc: t('feat2Desc') },
    { icon: '🎨', title: t('feat3Title'), desc: t('feat3Desc') },
  ];

  const moreFeatures = [
    { icon: '📢', label: t('more1') },
    { icon: '📊', label: t('more2') },
    { icon: '🛍️', label: t('more3') },
    { icon: '📅', label: t('more4') },
    { icon: '📈', label: t('more5') },
    { icon: '⭐', label: t('more6') },
  ];

  const steps = [
    { num: '01', title: t('step1Title'), desc: t('step1Desc') },
    { num: '02', title: t('step2Title'), desc: t('step2Desc') },
    { num: '03', title: t('step3Title'), desc: t('step3Desc') },
  ];

  const faqs = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
    { q: t('faq5Q'), a: t('faq5A') },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-24 pb-24">
      {/* ═══ HERO ═══ */}
      <FadeUp>
        <section className="text-center pt-12 sm:pt-20">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-4 font-bold">
            JazzNode for Venues
          </p>
          <h1 className="font-serif text-4xl sm:text-6xl font-bold leading-tight mb-6">
            {t('heroTitle')}
          </h1>
          <p className="text-lg sm:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('heroSubtitle')}
          </p>
          <Link
            href={`/${locale}/for-venues/apply`}
            className="inline-block px-8 py-3.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            {t('heroCta')}
          </Link>
        </section>
      </FadeUp>

      {/* ═══ CORE FEATURES (3 big cards) ═══ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feat, i) => (
          <FadeUp key={i}>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 h-full">
              <span className="text-3xl mb-4 block">{feat.icon}</span>
              <h3 className="font-serif text-xl font-bold mb-3">{feat.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{feat.desc}</p>
            </div>
          </FadeUp>
        ))}
      </section>

      {/* ═══ MORE FEATURES (6 small cards) ═══ */}
      <FadeUp>
        <section>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-center mb-10">{t('moreTitle')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {moreFeatures.map((feat, i) => (
              <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 text-center">
                <span className="text-2xl mb-2 block">{feat.icon}</span>
                <p className="text-sm font-medium">{feat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeUp>

      {/* ═══ HOW IT WORKS (3 steps) ═══ */}
      <FadeUp>
        <section>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-center mb-12">{t('stepsTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold)] font-serif text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeUp>

      {/* ═══ PRICING ═══ */}
      <FadeUp>
        <section className="text-center">
          <div className="inline-block bg-[var(--card)] border border-[var(--color-gold)]/20 rounded-2xl p-10 max-w-md">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2 font-bold">Elite</p>
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="font-serif text-5xl font-bold">$29.99</span>
              <span className="text-[var(--muted-foreground)] text-sm">{t('perMonth')}</span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">{t('annualPrice')}</p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mb-6">{t('pricingNote')}</p>
            <Link
              href={`/${locale}/for-venues/apply`}
              className="inline-block w-full px-8 py-3 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              {t('heroCta')}
            </Link>
          </div>
        </section>
      </FadeUp>

      {/* ═══ FAQ ═══ */}
      <FadeUp>
        <section>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-center mb-10">{t('faqTitle')}</h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl group">
                <summary className="px-6 py-4 cursor-pointer text-sm font-semibold flex items-center justify-between">
                  {faq.q}
                  <svg className="w-4 h-4 text-[var(--muted-foreground)] group-open:rotate-180 transition-transform shrink-0 ml-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <p className="px-6 pb-4 text-sm text-[var(--muted-foreground)] leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </FadeUp>

      {/* ═══ BOTTOM CTA ═══ */}
      <FadeUp>
        <section className="text-center py-12 border-t border-[var(--border)]">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">{t('bottomTitle')}</h2>
          <p className="text-[var(--muted-foreground)] mb-8">{t('bottomSubtitle')}</p>
          <Link
            href={`/${locale}/for-venues/apply`}
            className="inline-block px-8 py-3.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            {t('heroCta')}
          </Link>
        </section>
      </FadeUp>
    </div>
  );
}
