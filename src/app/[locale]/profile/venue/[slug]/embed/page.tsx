'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com';

export default function VenueEmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const locale = useLocale();
  const { user, loading } = useAuth();
  const { previewVenueTier, adminModeEnabled } = useAdmin();
  const { isUnlocked, minTier } = useTierConfig();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [copied, setCopied] = useState(false);

  // Customization
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [eventLimit, setEventLimit] = useState('6');
  const [embedLocale, setEmbedLocale] = useState(locale);
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('500');

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug || !user) return;
    const supabase = createClient();
    supabase
      .from('venues')
      .select('tier')
      .eq('venue_id', slug)
      .single()
      .then(({ data }) => { if (data) setTier(data.tier); });
  }, [slug, user]);

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('locale', embedLocale);
    params.set('theme', theme);
    if (eventLimit !== '6') params.set('limit', eventLimit);
    return `${SITE_URL}/embed/venues/${slug}?${params.toString()}`;
  }, [slug, theme, eventLimit, embedLocale]);

  const embedCode = useMemo(() => {
    return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" style="border:none;border-radius:12px;overflow:hidden;" loading="lazy"></iframe>`;
  }, [embedUrl, width, height]);

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewVenueTier ?? tier;
  const embedMinTier = minTier('venue', 'embed_calendar');

  if (!isUnlocked('venue', 'embed_calendar', effectiveTier, adminModeEnabled)) {
    return (
      <div className="space-y-6">
        <FadeUp><h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('embedTitle')}</h1></FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-cyan-400/5 to-cyan-400/10 border border-cyan-400/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-cyan-400/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('embedLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">{t('embedLockedDesc')}</p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mb-6">{t('premiumLockedHint')}</p>
            <Link href={`/${locale}/tiers`} className="inline-block px-6 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {embedMinTier <= 2 ? t('upgradePremium') : t('upgradeElite')}
            </Link>
          </div>
        </FadeUp>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('embedTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">{t('embedDescription')}</p>
      </FadeUp>

      {/* Customization */}
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
            {t('embedCustomize')}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Theme */}
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1.5">{t('embedTheme')}</label>
              <div className="flex gap-2">
                {(['dark', 'light'] as const).map((th) => (
                  <button
                    key={th}
                    onClick={() => setTheme(th)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      theme === th
                        ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/30'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-transparent'
                    }`}
                  >
                    {th === 'dark' ? t('dark') : t('light')}
                  </button>
                ))}
              </div>
            </div>

            {/* Locale */}
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1.5">{t('embedLanguage')}</label>
              <select
                value={embedLocale}
                onChange={(e) => setEmbedLocale(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="th">ไทย</option>
                <option value="id">Indonesia</option>
              </select>
            </div>

            {/* Event limit */}
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1.5">{t('embedLimit')}</label>
              <select
                value={eventLimit}
                onChange={(e) => setEventLimit(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
              >
                {[3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={String(n)}>{n}</option>
                ))}
              </select>
            </div>

            {/* Height */}
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1.5">{t('embedHeight')}</label>
              <select
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
              >
                {['300', '400', '500', '600', '800'].map((h) => (
                  <option key={h} value={h}>{h}px</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* Preview */}
      <FadeUp>
        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
            {t('embedPreview')}
          </h2>
          <div className="rounded-2xl overflow-hidden border border-[var(--border)]" style={{ height: `${height}px` }}>
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              loading="lazy"
            />
          </div>
        </div>
      </FadeUp>

      {/* Embed code */}
      <FadeUp>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {t('embedCode')}
            </h2>
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                copied
                  ? 'bg-emerald-400/15 text-emerald-400'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {copied ? t('copied') : t('copyCode')}
            </button>
          </div>
          <pre className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-xs font-mono overflow-x-auto text-[var(--muted-foreground)] whitespace-pre-wrap break-all">
            {embedCode}
          </pre>
        </div>
      </FadeUp>
    </div>
  );
}
