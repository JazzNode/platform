'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { useTheme } from '@/components/ThemeProvider';
import { createClient } from '@/utils/supabase/client';
import { themes, themeOrder, type Theme } from '@/lib/themes';
import FadeUp from '@/components/animations/FadeUp';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

async function getFreshToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export default function ArtistBrandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');
  const locale = useLocale();
  const { user, loading } = useAuth();
  const { previewArtistTier, adminModeEnabled } = useAdmin();
  const { isUnlocked } = useTierConfig();
  const { setTheme: applyGlobalTheme, themeId: currentThemeId } = useTheme();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [originalTheme, setOriginalTheme] = useState('');

  // ── Brand state ──
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [uploadingOg, setUploadingOg] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const ogInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug || !user) return;
    setOriginalTheme(currentThemeId);

    (async () => {
      const token = await getFreshToken();
      const res = await fetch(`/api/artist/branding?artistId=${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTier(data.tier ?? 0);
        setSelectedTheme(data.brand_theme_id || null);
        setCtaLabel(data.custom_cta_label || '');
        setCtaUrl(data.custom_cta_url || '');
        setCustomSlug(data.custom_slug || '');
        setOgImageUrl(data.brand_og_image_url || '');
        setCustomDomain(data.brand_custom_domain || '');
        if (data.brand_theme_id) applyGlobalTheme(data.brand_theme_id);
      }
      setFetching(false);
    })();

    return () => {
      if (originalTheme) applyGlobalTheme(originalTheme);
    };
  }, [slug, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectTheme = (id: string) => { setSelectedTheme(id); applyGlobalTheme(id); };
  const handleClearTheme = () => { setSelectedTheme(null); if (originalTheme) applyGlobalTheme(originalTheme); };

  const validateSlug = (val: string) => {
    setCustomSlug(val);
    if (!val) { setSlugError(''); return; }
    const lower = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setCustomSlug(lower);
    if (lower.length < 3 || lower.length > 40) {
      setSlugError('3-40 characters');
    } else if (!SLUG_RE.test(lower)) {
      setSlugError('Lowercase letters, numbers, hyphens only');
    } else {
      setSlugError('');
    }
  };

  const handleUploadOg = useCallback(async (file: File) => {
    setUploadingOg(true);
    try {
      const freshToken = await getFreshToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('artistId', slug);
      const res = await fetch('/api/artist/upload-photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.photoUrl) {
        setOgImageUrl(data.photoUrl);
      }
    } catch { /* ignore */ }
    setUploadingOg(false);
  }, [slug]);

  const handleSave = useCallback(async () => {
    if (!slug || saving) return;
    if (slugError) return;
    setSaving(true);
    try {
      const freshToken = await getFreshToken();
      const res = await fetch('/api/artist/branding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({
          artistId: slug,
          fields: {
            brand_theme_id: selectedTheme || null,
            custom_cta_label: ctaLabel.trim() || null,
            custom_cta_url: ctaUrl.trim() || null,
            custom_slug: customSlug.trim() || null,
            brand_og_image_url: ogImageUrl.trim() || null,
            brand_custom_domain: customDomain.trim() || null,
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }, [slug, selectedTheme, ctaLabel, ctaUrl, customSlug, ogImageUrl, customDomain, slugError, saving]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewArtistTier ?? tier;
  if (effectiveTier < 3 && !adminModeEnabled) {
    return (
      <div className="space-y-6">
        <FadeUp><h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('brandingTitle')}</h1></FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-violet-400/5 to-violet-400/10 border border-violet-400/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-violet-400/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17" cy="15.5" r="2.5" /><circle cx="8.5" cy="15.5" r="2.5" />
              <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('brandingLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">{t('brandingLockedDesc', { fallback: 'Upgrade to Elite to unlock custom branding.' })}</p>
            <Link href={`/${locale}/tiers`} className="inline-block px-6 py-2.5 rounded-xl bg-violet-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {t('upgradeElite')}
            </Link>
          </div>
        </FadeUp>
      </div>
    );
  }

  const themeLabel = (theme: Theme) => {
    switch (locale) { case 'zh': return theme.label_zh; case 'ja': return theme.label_ja; case 'ko': return theme.label_ko; case 'th': return theme.label_th; case 'id': return theme.label_id; default: return theme.label; }
  };

  const cardClass = 'bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4';
  const sectionTitle = 'text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold';

  return (
    <div className="space-y-6">
      {/* Header + Save */}
      <FadeUp>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('brandingTitle')}</h1>
          <button onClick={handleSave} disabled={saving || !!slugError}
            className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90'} disabled:opacity-30`}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : saved ? t('brandingSaved') : t('brandingSave')}
          </button>
        </div>
      </FadeUp>

      {/* ─── 1. Theme Selector ─── */}
      <FadeUp>
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h2 className={sectionTitle}>{t('brandingTheme')}</h2>
            {selectedTheme && <button onClick={handleClearTheme} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">{t('resetTheme')}</button>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {themeOrder.map((id) => {
              const theme = themes[id];
              const isSelected = selectedTheme === id;
              return (
                <button key={id} onClick={() => handleSelectTheme(id)}
                  className={`relative rounded-xl p-4 text-left transition-all ${isSelected ? 'ring-2 ring-[var(--color-gold)] ring-offset-2 ring-offset-[var(--background)]' : 'hover:scale-[1.02]'}`}
                  style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                  <div className="flex gap-1.5 mb-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent2 }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accentBright }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: theme.text }}>{theme.emoji} {themeLabel(theme)}</p>
                  <div className="mt-2 h-1 rounded-full" style={{ backgroundColor: theme.accent, width: '60%' }} />
                  {isSelected && <div className="absolute top-2 right-2"><svg className="w-4 h-4" viewBox="0 0 24 24" fill={theme.accent} stroke={theme.accent} strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg></div>}
                </button>
              );
            })}
          </div>
        </div>
      </FadeUp>

      {/* ─── 2. Custom CTA ─── */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionTitle}>{t('brandingCTA')}</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('brandingCtaLabel')}</label>
              <input type="text" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="e.g. Book Now"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('brandingCtaUrl')}</label>
              <input type="url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..."
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none" />
            </div>
            {ctaLabel && (
              <div className="pt-2">
                <p className="text-[10px] text-[var(--muted-foreground)] mb-1">Preview</p>
                <span className="inline-block px-5 py-2 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest">
                  {ctaLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </FadeUp>

      {/* ─── 3. Vanity URL / Custom Slug ─── */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionTitle}>{t('brandingSlug')}</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">jazznode.com/artists/</span>
              <input type="text" value={customSlug} onChange={(e) => validateSlug(e.target.value)} placeholder={slug}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none font-mono text-sm" />
            </div>
            {slugError && <p className="text-xs text-red-400">{slugError}</p>}
            {customSlug && !slugError && (
              <p className="text-xs text-[var(--muted-foreground)]">
                {t('brandingSlugPreview')}: <span className="font-mono text-[var(--foreground)]">jazznode.com/artists/{customSlug}</span>
              </p>
            )}
          </div>
        </div>
      </FadeUp>

      {/* ─── 4. OG Image ─── */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionTitle}>{t('brandingOgImage')}</h2>
          <input ref={ogInputRef} type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleUploadOg(e.target.files[0]); }} className="hidden" />
          {ogImageUrl ? (
            <div className="relative group">
              <img src={ogImageUrl} alt="OG" className="w-full aspect-[1200/630] object-cover rounded-xl border border-[var(--border)]" />
              <button onClick={() => ogInputRef.current?.click()} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-xs font-bold">
                {t('changeImage')}
              </button>
            </div>
          ) : (
            <button onClick={() => ogInputRef.current?.click()} disabled={uploadingOg}
              className="w-full aspect-[1200/630] rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--color-gold)]/50 flex items-center justify-center text-xs text-[var(--muted-foreground)] transition-colors">
              {uploadingOg ? <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" /> : t('uploadOgImage')}
            </button>
          )}
          <p className="text-[10px] text-[var(--muted-foreground)]/60">1200x630px</p>
        </div>
      </FadeUp>

      {/* ─── 5. Custom Domain ─── */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionTitle}>{t('brandingDomain')}</h2>
          <input type="text" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="artists.yourdomain.com"
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none font-mono text-sm" />
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{t('brandingDomainHint')}</p>
        </div>
      </FadeUp>
    </div>
  );
}
