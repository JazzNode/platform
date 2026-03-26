'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { useTheme } from '@/components/ThemeProvider';
import { createClient } from '@/utils/supabase/client';
import { themes, themeOrder, type Theme } from '@/lib/themes';
import FadeUp from '@/components/animations/FadeUp';

export default function VenueBrandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const locale = useLocale();
  const { user, loading } = useAuth();
  const { previewVenueTier, adminModeEnabled } = useAdmin();
  const { isUnlocked, minTier } = useTierConfig();
  const { setTheme: applyGlobalTheme, themeId: currentThemeId } = useTheme();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Brand state
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState('');
  const [originalTheme, setOriginalTheme] = useState<string>('');

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug || !user) return;
    // Save the user's current theme so we can restore on leave
    setOriginalTheme(currentThemeId);

    const supabase = createClient();
    supabase
      .from('venues')
      .select('tier, brand_theme_id, brand_accent_color')
      .eq('venue_id', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setTier(data.tier ?? 0);
          setSelectedTheme(data.brand_theme_id || null);
          setAccentColor(data.brand_accent_color || '');
          // Preview the venue's brand theme
          if (data.brand_theme_id) {
            applyGlobalTheme(data.brand_theme_id);
          }
        }
        setFetching(false);
      });

    return () => {
      // Restore user's theme when leaving branding page
      if (originalTheme) applyGlobalTheme(originalTheme);
    };
  }, [slug, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    applyGlobalTheme(themeId);
  };

  const handleClearTheme = () => {
    setSelectedTheme(null);
    setAccentColor('');
    if (originalTheme) applyGlobalTheme(originalTheme);
  };

  const handleSave = useCallback(async () => {
    if (!slug || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/venue/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: slug,
          fields: {
            brand_theme_id: selectedTheme || null,
            brand_accent_color: accentColor.trim() || null,
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {}
    setSaving(false);
  }, [slug, selectedTheme, accentColor, saving]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewVenueTier ?? tier;
  const brandMinTier = minTier('venue', 'custom_theme');

  if (!isUnlocked('venue', 'custom_theme', effectiveTier, adminModeEnabled)) {
    return (
      <div className="space-y-6">
        <FadeUp><h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('brandingTitle')}</h1></FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-violet-400/5 to-violet-400/10 border border-violet-400/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-violet-400/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r="2.5" />
              <circle cx="17" cy="15.5" r="2.5" />
              <circle cx="8.5" cy="15.5" r="2.5" />
              <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('brandingLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">{t('brandingLockedDesc')}</p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mb-6">{t('eliteLockedHint')}</p>
            <Link href={`/${locale}/tiers`} className="inline-block px-6 py-2.5 rounded-xl bg-violet-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {t('upgradeElite')}
            </Link>
          </div>
        </FadeUp>
      </div>
    );
  }

  const themeLabel = (theme: Theme) => {
    switch (locale) {
      case 'zh': return theme.label_zh;
      case 'ja': return theme.label_ja;
      case 'ko': return theme.label_ko;
      case 'th': return theme.label_th;
      case 'id': return theme.label_id;
      default: return theme.label;
    }
  };

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('brandingTitle')}</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">{t('brandingDescription')}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90'
            } disabled:opacity-30`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved ? t('saved') : t('saveBranding')}
          </button>
        </div>
      </FadeUp>

      {/* Theme Selector */}
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {t('selectTheme')}
            </h2>
            {selectedTheme && (
              <button
                onClick={handleClearTheme}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                {t('resetTheme')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {themeOrder.map((id) => {
              const theme = themes[id];
              const isSelected = selectedTheme === id;
              return (
                <button
                  key={id}
                  onClick={() => handleSelectTheme(id)}
                  className={`relative rounded-xl p-4 text-left transition-all ${
                    isSelected
                      ? 'ring-2 ring-[var(--color-gold)] ring-offset-2 ring-offset-[var(--background)]'
                      : 'hover:scale-[1.02]'
                  }`}
                  style={{
                    backgroundColor: theme.bg,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  {/* Color preview dots */}
                  <div className="flex gap-1.5 mb-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent2 }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accentBright }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: theme.text }}>
                    {theme.emoji} {themeLabel(theme)}
                  </p>
                  <div className="mt-2 h-1 rounded-full" style={{ backgroundColor: theme.accent, width: '60%' }} />

                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={theme.accent} stroke={theme.accent} strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </FadeUp>

      {/* Custom Accent Color */}
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
            {t('customAccent')}
          </h2>
          <p className="text-xs text-[var(--muted-foreground)]">{t('customAccentDesc')}</p>

          <div className="flex items-center gap-4">
            <input
              type="color"
              value={accentColor || '#C8A84E'}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-12 h-12 rounded-xl border border-[var(--border)] cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#C8A84E"
              className="w-32 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
            />
            {accentColor && (
              <button
                onClick={() => setAccentColor('')}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                {t('clearAccent')}
              </button>
            )}
          </div>
        </div>
      </FadeUp>

      {/* Preview hint */}
      <FadeUp>
        <div className="text-center py-4">
          <p className="text-xs text-[var(--muted-foreground)]">
            {t('brandingPreviewHint')}
          </p>
          <Link
            href={`/${locale}/venues/${slug}`}
            target="_blank"
            className="text-xs text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors mt-1 inline-block"
          >
            {t('previewVenuePage')} →
          </Link>
        </div>
      </FadeUp>
    </div>
  );
}
