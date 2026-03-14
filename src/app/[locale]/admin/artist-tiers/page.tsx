'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';
import type { TierFeatures } from '@/components/TierConfigProvider';

const TIER_NAMES = ['Free', 'Claimed', 'Premium', 'Elite'];
const TIER_COLORS = [
  'text-zinc-400',
  'text-blue-400',
  'text-amber-400',
  'text-purple-400',
];
const TIER_BG = [
  'bg-zinc-500/10',
  'bg-blue-500/10',
  'bg-amber-500/10',
  'bg-purple-500/10',
];

interface FeatureKey {
  key: string;
  labelKey: string;
  categoryKey: string;
}

const ARTIST_FEATURES: FeatureKey[] = [
  // Profile & Identity
  { key: 'public_profile', labelKey: 'af_publicProfile', categoryKey: 'ac_profile' },
  { key: 'edit_profile', labelKey: 'af_editProfile', categoryKey: 'ac_profile' },
  { key: 'verified_badge', labelKey: 'af_verifiedBadge', categoryKey: 'ac_profile' },
  { key: 'custom_bio', labelKey: 'af_customBio', categoryKey: 'ac_profile' },
  { key: 'social_links', labelKey: 'af_socialLinks', categoryKey: 'ac_profile' },
  // Discovery & Visibility
  { key: 'search_listing', labelKey: 'af_searchListing', categoryKey: 'ac_discovery' },
  { key: 'event_association', labelKey: 'af_eventAssociation', categoryKey: 'ac_discovery' },
  { key: 'priority_search', labelKey: 'af_prioritySearch', categoryKey: 'ac_discovery' },
  // Tools & Analytics
  { key: 'gear_showcase', labelKey: 'af_gearLimited', categoryKey: 'ac_tools' },
  { key: 'gear_unlimited', labelKey: 'af_gearUnlimited', categoryKey: 'ac_tools' },
  { key: 'epk_basic', labelKey: 'af_epkBasic', categoryKey: 'ac_tools' },
  { key: 'epk_full', labelKey: 'af_epkFull', categoryKey: 'ac_tools' },
  { key: 'analytics_basic', labelKey: 'af_analyticsBasic', categoryKey: 'ac_tools' },
  { key: 'analytics_advanced', labelKey: 'af_analyticsAdvanced', categoryKey: 'ac_tools' },
  { key: 'broadcasts', labelKey: 'af_broadcasts', categoryKey: 'ac_tools' },
  { key: 'inbox', labelKey: 'af_inbox', categoryKey: 'ac_tools' },
  // Business & Bookings
  { key: 'available_for_hire', labelKey: 'af_availableForHire', categoryKey: 'ac_business' },
  { key: 'booking_requests', labelKey: 'af_bookingRequests', categoryKey: 'ac_business' },
];

export default function ArtistTiersPage() {
  const { token } = useAdmin();
  const t = useTranslations('adminHQ');
  const [features, setFeatures] = useState<TierFeatures>({});
  const [originalFeatures, setOriginalFeatures] = useState<TierFeatures>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tier-config');
      const data = await res.json();
      if (data.artist?.features) {
        setFeatures(data.artist.features);
        setOriginalFeatures(data.artist.features);
      }
    } catch (err) {
      console.error('Failed to fetch tier config:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleTierClick = (featureKey: string, tierIndex: number) => {
    setFeatures((prev) => {
      const current = prev[featureKey] ?? 0;
      // If clicking the currently set tier, toggle it off (set to tier+1, or if clicking 0 keep 0)
      // Otherwise set to the clicked tier
      const newVal = current === tierIndex ? tierIndex + 1 : tierIndex;
      return { ...prev, [featureKey]: Math.min(newVal, 3) };
    });
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!token || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/tier-config', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entityType: 'artist', features }),
      });
      if (res.ok) {
        setOriginalFeatures(features);
        setSaved(true);
        setDirty(false);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setFeatures(originalFeatures);
    setDirty(false);
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Group features by category
  const categories = [...new Set(ARTIST_FEATURES.map((f) => f.categoryKey))];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">{t('artistTiersTitle')}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('artistTiersDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30 transition-all"
            >
              {t('cancel')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              dirty
                ? 'bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90'
                : saved
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
            }`}
          >
            {saving ? '...' : saved ? t('saved') : t('save')}
          </button>
        </div>
      </div>

      {/* Hint */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm text-[var(--muted-foreground)]">
        <p>{t('tierConfigHint')}</p>
      </div>

      {/* Interactive Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className="text-left py-4 px-4 text-sm text-[var(--muted-foreground)] font-normal w-[40%]">
                {t('feature')}
              </th>
              {TIER_NAMES.map((name, i) => (
                <th key={name} className="py-4 px-2 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs tracking-wider uppercase font-semibold ${TIER_BG[i]} ${TIER_COLORS[i]}`}>
                    {name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <>
                <tr key={`cat-${cat}`}>
                  <td
                    colSpan={5}
                    className="pt-6 pb-2 px-4 text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-semibold border-b border-[var(--border)]"
                  >
                    {t(cat)}
                  </td>
                </tr>
                {ARTIST_FEATURES.filter((f) => f.categoryKey === cat).map((feat, fi) => {
                  const minTier = features[feat.key] ?? 0;
                  return (
                    <tr
                      key={feat.key}
                      className={`${fi % 2 === 0 ? 'bg-[var(--card)]/30' : ''} hover:bg-[var(--card)]/60 transition-colors`}
                    >
                      <td className="py-3 px-4 text-sm text-[var(--foreground)]">{t(feat.labelKey)}</td>
                      {TIER_NAMES.map((_, tierIdx) => {
                        const unlocked = tierIdx >= minTier;
                        return (
                          <td key={tierIdx} className="py-3 px-2 text-center">
                            <button
                              onClick={() => handleTierClick(feat.key, tierIdx)}
                              className={`w-8 h-8 rounded-lg transition-all inline-flex items-center justify-center ${
                                unlocked
                                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                                  : 'bg-zinc-800/50 text-zinc-600 hover:bg-zinc-700/50 border border-zinc-700/30'
                              }`}
                              title={unlocked ? `Unlocked at Tier ${minTier}` : `Locked (requires Tier ${minTier})`}
                            >
                              {unlocked ? (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lock behavior preview */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold">{t('lockBehaviorPreview')}</h2>
        <p className="text-sm text-[var(--muted-foreground)]">{t('lockBehaviorDesc')}</p>
        <div className="space-y-3">
          {ARTIST_FEATURES.filter((f) => (features[f.key] ?? 0) > 0).map((feat) => {
            const min = features[feat.key] ?? 0;
            return (
              <div key={feat.key} className="flex items-center gap-3 text-sm">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${TIER_BG[min]} ${TIER_COLORS[min]}`}>
                  {TIER_NAMES[min]}+
                </span>
                <span className="text-[var(--foreground)]">{t(feat.labelKey)}</span>
                <span className="text-[var(--muted-foreground)] text-xs ml-auto">
                  {min === 1 ? t('lockMsgClaim') : min === 2 ? t('lockMsgPremium') : t('lockMsgElite')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
