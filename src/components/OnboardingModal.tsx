'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthProvider';
import { createClient } from '@/utils/supabase/client';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/* Regions grouped: active markets first, then continents */
const REGIONS_ACTIVE = [
  'taiwan', 'hong_kong', 'singapore', 'malaysia', 'japan',
  'south_korea', 'thailand', 'indonesia', 'philippines',
] as const;

const REGIONS_CONTINENT = [
  'asia_other', 'north_america', 'europe', 'oceania', 'other',
] as const;

const ALL_REGIONS = [...REGIONS_ACTIVE, ...REGIONS_CONTINENT] as const;

export default function OnboardingModal() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = useTranslations('onboarding');
  const { needsOnboarding, user, refreshProfile } = useAuth();
  const [region, setRegion] = useState('');
  const [userType, setUserType] = useState<'fan' | 'industry' | ''>('');
  const [saving, setSaving] = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = needsOnboarding ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [needsOnboarding]);

  if (!mounted || !needsOnboarding) return null;

  const canSubmit = userType !== '' && region !== '';

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({
        region,
        user_type: userType,
      })
      .eq('id', user.id);
    await refreshProfile();
    setSaving(false);
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] opacity-100"
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[81] flex items-center justify-center">
        <div
          className="relative w-full max-w-sm mx-4 rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--background) 95%, transparent)',
            backdropFilter: 'blur(40px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
          }}
        >
          {/* Header */}
          <div className="border-b border-[var(--border)] py-3.5 text-center">
            <span className="text-sm font-semibold tracking-wide text-[var(--color-gold)]">
              {t('title')}
            </span>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
              {t('subtitle_1')}
              <br />
              {t('subtitle_2')}
            </p>

            {/* User Type — required */}
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-2 tracking-wide uppercase">
                {t('userTypeLabel')} <span className="text-[var(--color-gold)]">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {(['fan', 'industry'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setUserType(type)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all duration-200 ${
                      userType === type
                        ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--foreground)]'
                        : 'border-[var(--border)] bg-transparent text-[var(--muted-foreground)] hover:border-[var(--foreground)]/30'
                    }`}
                  >
                    <span className="font-medium">{t(`userType_${type}`)}</span>
                    <span className="block text-xs mt-0.5 opacity-70">{t(`userType_${type}_desc`)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Region — required */}
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1.5 tracking-wide uppercase">
                {t('regionLabel')} <span className="text-[var(--color-gold)]">*</span>
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]/50 transition-colors text-[var(--foreground)]"
              >
                <option value="">{t('regionPlaceholder')}</option>
                {REGIONS_ACTIVE.map((r) => (
                  <option key={r} value={r}>{t(`region_${r}`)}</option>
                ))}
                <option disabled>──────────</option>
                {REGIONS_CONTINENT.map((r) => (
                  <option key={r} value={r}>{t(`region_${r}`)}</option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="w-full h-10 rounded-lg bg-[var(--color-gold)] text-[#0A0A0A] text-sm font-bold tracking-wide transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? '...' : t('continue')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
