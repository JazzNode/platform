'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

async function getFreshToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export default function ArtistCustomSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');
  const locale = useLocale();
  const { user, loading } = useAuth();
  const { previewArtistTier, adminModeEnabled } = useAdmin();
  const { isUnlocked } = useTierConfig();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug || !user) return;
    (async () => {
      const token = await getFreshToken();
      const res = await fetch(`/api/artist/branding?artistId=${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTier(data.tier ?? 0);
        setCustomSlug(data.custom_slug || '');
        setOriginalSlug(data.custom_slug || '');
      }
      setFetching(false);
    })();
  }, [slug, user]);

  const validateSlug = (val: string) => {
    setApiError('');
    const lower = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setCustomSlug(lower);
    if (!lower) { setSlugError(''); return; }
    if (lower.length < 3 || lower.length > 40) {
      setSlugError(t('slugLength'));
    } else if (!SLUG_RE.test(lower)) {
      setSlugError(t('slugFormat'));
    } else {
      setSlugError('');
    }
  };

  const handleSave = useCallback(async () => {
    if (!slug || saving || slugError) return;
    setSaving(true);
    setApiError('');
    try {
      const freshToken = await getFreshToken();
      const res = await fetch('/api/artist/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({
          artistId: slug,
          fields: { custom_slug: customSlug.trim() || null },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setOriginalSlug(customSlug.trim());
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json();
        if (res.status === 409) {
          setApiError(t('slugTaken'));
        } else {
          setApiError(data.error || 'Error');
        }
      }
    } catch { /* ignore */ }
    setSaving(false);
  }, [slug, customSlug, slugError, saving, t]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewArtistTier ?? tier;
  const unlocked = isUnlocked('artist', 'custom_slug', effectiveTier, adminModeEnabled);

  if (!unlocked) {
    return (
      <div className="space-y-6">
        <FadeUp><h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('customSlugTitle')}</h1></FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-amber-400/5 to-amber-400/10 border border-amber-400/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-amber-400/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('customSlugLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">{t('customSlugLockedDesc')}</p>
            <Link href={`/${locale}/tiers`} className="inline-block px-6 py-2.5 rounded-xl bg-amber-500 text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {t('upgradePremium')}
            </Link>
          </div>
        </FadeUp>
      </div>
    );
  }

  const hasChange = customSlug !== originalSlug;

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('customSlugTitle')}</h1>
          <button
            onClick={handleSave}
            disabled={saving || !!slugError || !hasChange}
            className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              saved ? 'bg-emerald-500 text-white' : 'bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90'
            } disabled:opacity-30`}
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : saved ? t('saved') : t('save')}
          </button>
        </div>
      </FadeUp>

      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">{t('customSlugLabel')}</h2>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{t('customSlugDesc')}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">jazznode.com/artists/</span>
              <input
                type="text"
                value={customSlug}
                onChange={(e) => validateSlug(e.target.value)}
                placeholder={slug}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none font-mono text-sm"
              />
            </div>
            {slugError && <p className="text-xs text-red-400">{slugError}</p>}
            {apiError && <p className="text-xs text-red-400">{apiError}</p>}
            {customSlug && !slugError && (
              <p className="text-xs text-[var(--muted-foreground)]">
                {t('customSlugPreview')}: <span className="font-mono text-[var(--foreground)]">jazznode.com/artists/{customSlug}</span>
              </p>
            )}
            {!customSlug && (
              <p className="text-xs text-[var(--muted-foreground)]">
                {t('customSlugCurrent')}: <span className="font-mono text-[var(--foreground)]">jazznode.com/artists/{slug}</span>
              </p>
            )}
          </div>
        </div>
      </FadeUp>

      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">{t('customSlugRules')}</h2>
          <ul className="text-sm text-[var(--muted-foreground)] space-y-1.5 list-disc list-inside">
            <li>{t('slugRule1')}</li>
            <li>{t('slugRule2')}</li>
            <li>{t('slugRule3')}</li>
          </ul>
        </div>
      </FadeUp>
    </div>
  );
}
