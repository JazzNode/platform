'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import CountUp from '@/components/animations/CountUp';
import { useEffect, useRef, useState } from 'react';

const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';

/** Staggered hero reveal — mimics homepage HeroReveal pattern */
function VenueHeroReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const badge = el.querySelector<HTMLElement>('.vh-badge');
    const headline = el.querySelector<HTMLElement>('.vh-headline');
    const subtitle = el.querySelector<HTMLElement>('.vh-subtitle');
    const cta = el.querySelector<HTMLElement>('.vh-cta');
    const divider = el.querySelector<HTMLElement>('.vh-divider');

    [badge, headline, subtitle, cta].forEach((e) => {
      if (!e) return;
      e.style.opacity = '0';
      e.style.transform = 'translateY(40px)';
    });
    if (divider) {
      divider.style.transform = 'scaleX(0)';
      divider.style.opacity = '0';
    }

    const kickoff = setTimeout(() => {
      if (badge) {
        badge.style.transition = `opacity 0.8s ${EASE_OUT}, transform 0.8s ${EASE_OUT}`;
        badge.style.transitionDelay = '0.1s';
        badge.style.opacity = '1';
        badge.style.transform = 'translateY(0)';
      }
      if (headline) {
        headline.style.transition = `opacity 1s ${EASE_OUT}, transform 1s ${EASE_OUT}`;
        headline.style.transitionDelay = '0.3s';
        headline.style.opacity = '1';
        headline.style.transform = 'translateY(0)';
      }
      if (divider) {
        divider.style.transition = `transform 0.6s ${EASE_OUT}, opacity 0.4s ${EASE_OUT}`;
        divider.style.transitionDelay = '0.6s';
        divider.style.transform = 'scaleX(1)';
        divider.style.opacity = '1';
      }
      if (subtitle) {
        subtitle.style.transition = `opacity 0.8s ${EASE_OUT}, transform 0.8s ${EASE_OUT}`;
        subtitle.style.transitionDelay = '0.8s';
        subtitle.style.opacity = '1';
        subtitle.style.transform = 'translateY(0)';
      }
      if (cta) {
        cta.style.transition = `opacity 0.8s ${EASE_OUT}, transform 0.8s ${EASE_OUT}`;
        cta.style.transitionDelay = '1.1s';
        cta.style.opacity = '1';
        cta.style.transform = 'translateY(0)';
      }
    }, 50);

    return () => clearTimeout(kickoff);
  }, []);

  return <div ref={ref}>{children}</div>;
}

/** Expandable feature card for "more features" section */
function ExpandableCard({
  icon,
  label,
  desc,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  delay: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <FadeUpItem delay={delay}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left group bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 hover:border-[var(--color-gold)]/20 transition-colors duration-500"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-gold)]/8 flex items-center justify-center shrink-0 text-[var(--color-gold)] group-hover:bg-[var(--color-gold)]/15 transition-colors duration-500">
            {icon}
          </div>
          <p className="text-sm font-medium flex-1">{label}</p>
          <svg
            className={`w-4 h-4 text-[var(--muted-foreground)] shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: open ? 200 : 0, opacity: open ? 1 : 0, marginTop: open ? 12 : 0 }}
        >
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{desc}</p>
        </div>
      </button>
    </FadeUpItem>
  );
}

export default function ForVenuesClient({
  stats,
}: {
  stats: { cities: number; venues: number; events: number; artists: number };
}) {
  const t = useTranslations('forVenues');
  const locale = useLocale();
  const { profile, loading } = useAuth();

  // Owner-only gate
  if (!loading && profile?.role !== 'owner' && profile?.role !== 'admin') {
    return null;
  }

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
      title: t('feat1Title'),
      desc: t('feat1Desc'),
    },
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      ),
      title: t('feat2Title'),
      desc: t('feat2Desc'),
    },
    {
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      title: t('feat3Title'),
      desc: t('feat3Desc'),
    },
  ];

  const moreFeatures = [
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      label: t('more1'),
      desc: t('more1Desc'),
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      label: t('more2'),
      desc: t('more2Desc'),
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      label: t('more3'),
      desc: t('more3Desc'),
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      label: t('more4'),
      desc: t('more4Desc'),
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      label: t('more5'),
      desc: t('more5Desc'),
    },
    {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      label: t('more6'),
      desc: t('more6Desc'),
    },
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

  const tCommon = useTranslations('common');

  return (
    <div className="pb-24">
      {/* ═══════════ HERO ═══════════ */}
      <VenueHeroReveal>
        <section className="text-center pt-16 sm:pt-24 pb-16 max-w-4xl mx-auto px-4">
          <p className="vh-badge text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-6 font-bold">
            JazzNode for Venues
          </p>
          <h1 className="vh-headline font-serif text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.1] mb-6">
            {t('heroTitle')}
          </h1>
          <div
            className="vh-divider mx-auto mb-8"
            style={{ width: 60, height: 2, background: 'var(--color-gold)' }}
          />
          <p className="vh-subtitle text-base sm:text-lg text-[var(--muted-foreground)] max-w-xl mx-auto mb-10 leading-relaxed">
            {t('heroSubtitle')}
          </p>
          <div className="vh-cta">
            <Link
              href={`/${locale}/for-venues/apply`}
              className="inline-block px-10 py-4 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:bg-[var(--color-gold-bright)] transition-colors duration-300"
            >
              {t('heroCta')}
            </Link>
          </div>
        </section>
      </VenueHeroReveal>

      {/* ═══════════ STATS BAR (real data from DB) ═══════════ */}
      <FadeUp>
        <section className="border-y border-[var(--border)] py-10 mb-24">
          <div className="max-w-4xl mx-auto grid grid-cols-4 gap-4 sm:gap-8 px-4">
            {[
              { value: stats.cities, label: tCommon('cities') },
              { value: stats.venues, label: tCommon('venues') },
              { value: stats.events, label: tCommon('events') },
              { value: stats.artists, label: tCommon('artists') },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-serif text-2xl sm:text-4xl font-bold text-[var(--color-gold)]">
                  <CountUp end={s.value} trigger="visible" />
                </div>
                <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)] mt-1 uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      </FadeUp>

      {/* ═══════════ CORE FEATURES (3 cards — new messaging) ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <FadeUpItem key={i} delay={i * 100}>
              <div className="group bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 h-full hover:border-[var(--color-gold)]/30 transition-colors duration-500">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-gold)]/8 flex items-center justify-center mb-5 group-hover:bg-[var(--color-gold)]/15 transition-colors duration-500">
                  {feat.icon}
                </div>
                <h3 className="font-serif text-xl font-bold mb-3">{feat.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{feat.desc}</p>
              </div>
            </FadeUpItem>
          ))}
        </div>
      </section>

      {/* ═══════════ MORE FEATURES (expandable cards) ═══════════ */}
      <section className="max-w-5xl mx-auto px-4 mb-24">
        <FadeUp>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-center mb-12">{t('moreTitle')}</h2>
        </FadeUp>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {moreFeatures.map((feat, i) => (
            <ExpandableCard key={i} icon={feat.icon} label={feat.label} desc={feat.desc} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="max-w-4xl mx-auto px-4 mb-24">
        <FadeUp>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-center mb-16">{t('stepsTitle')}</h2>
        </FadeUp>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative">
          <div className="hidden md:block absolute top-6 left-[16.67%] right-[16.67%] h-px bg-[var(--border)]" />
          {steps.map((step, i) => (
            <FadeUpItem key={i} delay={i * 150}>
              <div className="text-center relative">
                <div className="w-12 h-12 rounded-full border-2 border-[var(--color-gold)] text-[var(--color-gold)] font-serif text-lg font-bold flex items-center justify-center mx-auto mb-5 bg-[var(--background)] relative z-10">
                  {step.num}
                </div>
                <h3 className="font-semibold text-base mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{step.desc}</p>
              </div>
            </FadeUpItem>
          ))}
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <FadeUp>
        <section className="max-w-md mx-auto px-4 mb-24">
          <div className="bg-[var(--card)] border border-[var(--color-gold)]/20 rounded-2xl p-10 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[var(--color-gold)]/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-[var(--color-gold)]/5 blur-3xl pointer-events-none" />
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3 font-bold relative">Elite</p>
            <div className="flex items-baseline justify-center gap-1 mb-2 relative">
              <span className="font-serif text-5xl sm:text-6xl font-bold">$29.99</span>
              <span className="text-[var(--muted-foreground)] text-sm">/{t('perMonth')}</span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mb-1 relative">{t('annualPrice')}</p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mb-8 relative">{t('pricingNote')}</p>
            <Link
              href={`/${locale}/for-venues/apply`}
              className="relative inline-block w-full px-8 py-3.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:bg-[var(--color-gold-bright)] transition-colors duration-300"
            >
              {t('heroCta')}
            </Link>
          </div>
        </section>
      </FadeUp>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="max-w-2xl mx-auto px-4 mb-24">
        <FadeUp>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-center mb-10">{t('faqTitle')}</h2>
        </FadeUp>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FadeUpItem key={i} delay={i * 60}>
              <details className="bg-[var(--card)] border border-[var(--border)] rounded-xl group hover:border-[var(--color-gold)]/15 transition-colors duration-500">
                <summary className="px-6 py-4 cursor-pointer text-sm font-semibold flex items-center justify-between select-none">
                  {faq.q}
                  <svg
                    className="w-4 h-4 text-[var(--muted-foreground)] group-open:rotate-180 transition-transform duration-300 shrink-0 ml-4"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <p className="px-6 pb-4 text-sm text-[var(--muted-foreground)] leading-relaxed">{faq.a}</p>
              </details>
            </FadeUpItem>
          ))}
        </div>
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <FadeUp>
        <section className="text-center py-16 border-t border-[var(--border)] max-w-3xl mx-auto px-4">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {t('bottomTitle')}
          </h2>
          <p className="text-[var(--muted-foreground)] mb-10 text-base sm:text-lg">{t('bottomSubtitle')}</p>
          <Link
            href={`/${locale}/for-venues/apply`}
            className="inline-block px-10 py-4 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:bg-[var(--color-gold-bright)] transition-colors duration-300"
          >
            {t('heroCta')}
          </Link>
        </section>
      </FadeUp>
    </div>
  );
}
