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
import { fontPairs, type FontPair } from '@/lib/brand-fonts';
import FadeUp from '@/components/animations/FadeUp';

const SECTION_KEYS = [
  { key: 'announcements', labelKey: 'sectionAnnouncements' },
  { key: 'about', labelKey: 'sectionAbout' },
  { key: 'merchandise', labelKey: 'sectionMerchandise' },
  { key: 'gallery', labelKey: 'sectionGallery' },
  { key: 'artists', labelKey: 'sectionArtists' },
  { key: 'practical', labelKey: 'sectionPractical' },
  { key: 'comments', labelKey: 'sectionComments' },
  { key: 'past_events', labelKey: 'sectionPastEvents' },
];

async function getFreshToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

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
  const [originalTheme, setOriginalTheme] = useState('');

  // ── Brand state ──
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState('');
  const [fontPairId, setFontPairId] = useState('default');
  const [heroStyle, setHeroStyle] = useState('cinematic');
  const [heroTextAlign, setHeroTextAlign] = useState('left');
  const [heroOverlay, setHeroOverlay] = useState(0.6);
  const [ctaText, setCtaText] = useState('');
  const [sectionsVisible, setSectionsVisible] = useState<Record<string, boolean>>({});
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [uploadingOg, setUploadingOg] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const ogInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug || !user) return;
    setOriginalTheme(currentThemeId);

    const supabase = createClient();
    supabase
      .from('venues')
      .select('tier, brand_theme_id, brand_accent_color, brand_font_pair, brand_hero_style, brand_hero_text_align, brand_hero_overlay_opacity, brand_cta_text, brand_sections_visible, brand_og_image_url, brand_favicon_url')
      .eq('venue_id', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setTier(data.tier ?? 0);
          setSelectedTheme(data.brand_theme_id || null);
          setAccentColor(data.brand_accent_color || '');
          setFontPairId(data.brand_font_pair || 'default');
          setHeroStyle(data.brand_hero_style || 'cinematic');
          setHeroTextAlign(data.brand_hero_text_align || 'left');
          setHeroOverlay(data.brand_hero_overlay_opacity ?? 0.6);
          setCtaText(data.brand_cta_text || '');
          setSectionsVisible(data.brand_sections_visible || {});
          setOgImageUrl(data.brand_og_image_url || '');
          setFaviconUrl(data.brand_favicon_url || '');
          if (data.brand_theme_id) applyGlobalTheme(data.brand_theme_id);
        }
        setFetching(false);
      });

    return () => {
      if (originalTheme) applyGlobalTheme(originalTheme);
    };
  }, [slug, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectTheme = (id: string) => { setSelectedTheme(id); applyGlobalTheme(id); };
  const handleClearTheme = () => { setSelectedTheme(null); setAccentColor(''); if (originalTheme) applyGlobalTheme(originalTheme); };

  const toggleSection = (key: string) => {
    setSectionsVisible((prev) => ({ ...prev, [key]: prev[key] === false ? true : false }));
  };

  const handleUploadImage = useCallback(async (
    file: File, type: 'og' | 'favicon',
  ) => {
    if (type === 'og') setUploadingOg(true);
    else setUploadingFavicon(true);
    try {
      const freshToken = await getFreshToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('venueId', slug);
      const res = await fetch('/api/venue/merchandise/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.image_url) {
        if (type === 'og') setOgImageUrl(data.image_url);
        else setFaviconUrl(data.image_url);
      }
    } catch {}
    if (type === 'og') setUploadingOg(false);
    else setUploadingFavicon(false);
  }, [slug]);

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
            brand_font_pair: fontPairId !== 'default' ? fontPairId : null,
            brand_hero_style: heroStyle !== 'cinematic' ? heroStyle : null,
            brand_hero_text_align: heroTextAlign !== 'left' ? heroTextAlign : null,
            brand_hero_overlay_opacity: heroOverlay !== 0.6 ? heroOverlay : null,
            brand_cta_text: ctaText.trim() || null,
            brand_sections_visible: Object.keys(sectionsVisible).length > 0 ? sectionsVisible : null,
            brand_og_image_url: ogImageUrl.trim() || null,
            brand_favicon_url: faviconUrl.trim() || null,
          },
        }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } catch {}
    setSaving(false);
  }, [slug, selectedTheme, accentColor, fontPairId, heroStyle, heroTextAlign, heroOverlay, ctaText, sectionsVisible, ogImageUrl, faviconUrl, saving]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewVenueTier ?? tier;
  if (!isUnlocked('venue', 'custom_theme', effectiveTier, adminModeEnabled)) {
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
    switch (locale) { case 'zh': return theme.label_zh; case 'ja': return theme.label_ja; case 'ko': return theme.label_ko; case 'th': return theme.label_th; case 'id': return theme.label_id; default: return theme.label; }
  };

  const cardClass = 'bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4';
  const sectionTitle = 'text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold';

  return (
    <div className="space-y-6">
      {/* Header + Save */}
      <FadeUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('brandingTitle')}</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">{t('brandingDescription')}</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90'} disabled:opacity-30`}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : saved ? t('saved') : t('saveBranding')}
          </button>
        </div>
      </FadeUp>

      {/* ─── 1. Theme Selector ─── */}
      <FadeUp>
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h2 className={sectionTitle}>{t('selectTheme')}</h2>
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

      {/* ─── 2. Custom Accent Color ─── */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionTitle}>{t('customAccent')}</h2>
          <p className="text-xs text-[var(--muted-foreground)]">{t('customAccentDesc')}</p>
          <div className="flex items-center gap-4">
            <input type="color" value={accentColor || '#C8A84E'} onChange={(e) => setAccentColor(e.target.value)} className="w-12 h-12 rounded-xl border border-[var(--border)] cursor-pointer bg-transparent" />
            <input type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} placeholder="#C8A84E" className="w-32 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none" />
            {accentColor && <button onClick={() => setAccentColor('')} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">{t('clearAccent')}</button>}
          </div>
        </div>
      </FadeUp>

      {/* ─── 3. Font Pairing ─── */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionTitle}>{t('fontPairing')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fontPairs.map((pair) => {
              const isSelected = fontPairId === pair.id;
              return (
                <button key={pair.id} onClick={() => setFontPairId(pair.id)}
                  className={`rounded-xl p-4 text-left transition-all border ${isSelected ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/5' : 'border-[var(--border)] hover:border-[var(--muted-foreground)]/30'}`}>
                  <p className="text-sm font-semibold" style={{ fontFamily: pair.heading }}>{locale === 'zh' ? pair.label_zh : pair.label}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1" style={{ fontFamily: pair.body }}>{pair.preview}</p>
                </button>
              );
            })}
          </div>
        </div>
      </FadeUp>

      {/* ─── 4. Hero Style ─── */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionTitle}>{t('heroStyle')}</h2>
          <div className="space-y-4">
            {/* Layout */}
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-2 block">{t('heroLayout')}</label>
              <div className="flex gap-2">
                {(['cinematic', 'contained', 'minimal'] as const).map((style) => (
                  <button key={style} onClick={() => setHeroStyle(style)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${heroStyle === style ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/30' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-transparent'}`}>
                    {t(`hero_${style}`)}
                  </button>
                ))}
              </div>
            </div>
            {/* Text align */}
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-2 block">{t('heroTextPosition')}</label>
              <div className="flex gap-2">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button key={align} onClick={() => setHeroTextAlign(align)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${heroTextAlign === align ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/30' : 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-transparent'}`}>
                    {t(`align_${align}`)}
                  </button>
                ))}
              </div>
            </div>
            {/* Overlay opacity */}
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-2 block">{t('heroOverlay')} ({Math.round(heroOverlay * 100)}%)</label>
              <input type="range" min="0" max="1" step="0.05" value={heroOverlay} onChange={(e) => setHeroOverlay(parseFloat(e.target.value))}
                className="w-full accent-[var(--color-gold)]" />
            </div>
          </div>
        </div>
      </FadeUp>

      {/* ─── 5. Custom CTA Text ─── */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionTitle}>{t('customCta')}</h2>
          <p className="text-xs text-[var(--muted-foreground)]">{t('customCtaDesc')}</p>
          <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder={t('ctaPlaceholder')}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none" />
        </div>
      </FadeUp>

      {/* ─── 6. Section Visibility ─── */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionTitle}>{t('sectionVisibility')}</h2>
          <p className="text-xs text-[var(--muted-foreground)]">{t('sectionVisibilityDesc')}</p>
          <div className="space-y-2">
            {SECTION_KEYS.map(({ key, labelKey }) => {
              const visible = sectionsVisible[key] !== false;
              return (
                <label key={key} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[var(--muted)]/50 cursor-pointer transition-colors">
                  <span className="text-sm">{t(labelKey)}</span>
                  <button onClick={() => toggleSection(key)}
                    className={`w-10 h-6 rounded-full transition-colors ${visible ? 'bg-[var(--color-gold)]' : 'bg-[var(--muted)]'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${visible ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </label>
              );
            })}
          </div>
        </div>
      </FadeUp>

      {/* ─── 7. OG Image + Favicon ─── */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionTitle}>{t('mediaAssets')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* OG Image */}
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-2 block">{t('ogImage')}</label>
              <input ref={ogInputRef} type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleUploadImage(e.target.files[0], 'og'); }} className="hidden" />
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
              <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-1">1200x630px — {t('ogImageDesc')}</p>
            </div>

            {/* Favicon */}
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-2 block">{t('favicon')}</label>
              <input ref={faviconInputRef} type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleUploadImage(e.target.files[0], 'favicon'); }} className="hidden" />
              <div className="flex items-center gap-3">
                {faviconUrl ? (
                  <div className="relative group">
                    <img src={faviconUrl} alt="Favicon" className="w-12 h-12 rounded-lg object-cover border border-[var(--border)]" />
                    <button onClick={() => faviconInputRef.current?.click()} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
                      {t('changeImage')}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => faviconInputRef.current?.click()} disabled={uploadingFavicon}
                    className="w-12 h-12 rounded-lg border-2 border-dashed border-[var(--border)] hover:border-[var(--color-gold)]/50 flex items-center justify-center text-xs text-[var(--muted-foreground)] transition-colors">
                    {uploadingFavicon ? <div className="w-4 h-4 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" /> : '+'}
                  </button>
                )}
                <p className="text-[10px] text-[var(--muted-foreground)]/60">{t('faviconDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* Preview link */}
      <FadeUp>
        <div className="text-center py-4">
          <p className="text-xs text-[var(--muted-foreground)]">{t('brandingPreviewHint')}</p>
          <Link href={`/${locale}/venues/${slug}`} target="_blank" className="text-xs text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors mt-1 inline-block">
            {t('previewVenuePage')} →
          </Link>
        </div>
      </FadeUp>
    </div>
  );
}
