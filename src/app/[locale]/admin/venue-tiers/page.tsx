'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';
import { TIER_DISABLED, ALL_TIERS, type TierFeatures } from '@/components/TierConfigProvider';

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

/** Features listed in the tier config but not yet built in the frontend */
const NOT_IMPLEMENTED = new Set([
  'backline',
  'priority_search',
  'custom_domain',
  'custom_theme',
  'ticketing',
  'broadcasts_unlimited',
  'revenue_analytics',
  'multi_location',
  'ical_api',
]);

const VENUE_FEATURES: FeatureKey[] = [
  // Tier 0 — Fan-facing (always visible)
  { key: 'public_listing', labelKey: 'vf_publicListing', categoryKey: 'vc_fanFacing' },
  { key: 'search_listing', labelKey: 'vf_searchListing', categoryKey: 'vc_fanFacing' },
  { key: 'map_pin', labelKey: 'vf_mapPin', categoryKey: 'vc_fanFacing' },
  { key: 'event_showcase', labelKey: 'vf_eventShowcase', categoryKey: 'vc_fanFacing' },
  { key: 'venue_tags', labelKey: 'vf_venueTags', categoryKey: 'vc_fanFacing' },
  // Tier 1 — Claimed (edit rights + identity)
  { key: 'edit_profile', labelKey: 'vf_editProfile', categoryKey: 'vc_claimed' },
  { key: 'verified_badge', labelKey: 'vf_verifiedBadge', categoryKey: 'vc_claimed' },
  { key: 'photos', labelKey: 'vf_photos', categoryKey: 'vc_claimed' },
  { key: 'description', labelKey: 'vf_description', categoryKey: 'vc_claimed' },
  { key: 'inbox', labelKey: 'vf_inbox', categoryKey: 'vc_claimed' },
  // Tier 2 — Premium (operational tools)
  { key: 'schedule_manager', labelKey: 'vf_scheduleManager', categoryKey: 'vc_premium' },
  { key: 'backline', labelKey: 'vf_backline', categoryKey: 'vc_premium' },
  { key: 'analytics_basic', labelKey: 'vf_analyticsBasic', categoryKey: 'vc_premium' },
  { key: 'analytics_advanced', labelKey: 'vf_analyticsAdvanced', categoryKey: 'vc_premium' },
  { key: 'broadcasts', labelKey: 'vf_broadcasts', categoryKey: 'vc_premium' },
  { key: 'priority_search', labelKey: 'vf_prioritySearch', categoryKey: 'vc_premium' },
  // Tier 3 — Elite (business engine)
  { key: 'custom_domain', labelKey: 'vf_customDomain', categoryKey: 'vc_elite' },
  { key: 'custom_theme', labelKey: 'vf_customTheme', categoryKey: 'vc_elite' },
  { key: 'ticketing', labelKey: 'vf_ticketing', categoryKey: 'vc_elite' },
  { key: 'broadcasts_unlimited', labelKey: 'vf_broadcastsUnlimited', categoryKey: 'vc_elite' },
  { key: 'revenue_analytics', labelKey: 'vf_revenueAnalytics', categoryKey: 'vc_elite' },
  { key: 'multi_location', labelKey: 'vf_multiLocation', categoryKey: 'vc_elite' },
  { key: 'ical_api', labelKey: 'vf_icalApi', categoryKey: 'vc_elite' },
];

export default function VenueTiersPage() {
  const { token } = useAdmin();
  const t = useTranslations('adminHQ');
  const [features, setFeatures] = useState<TierFeatures>({});
  const [originalFeatures, setOriginalFeatures] = useState<TierFeatures>({});
  const [visibleTiers, setVisibleTiers] = useState<number[]>(ALL_TIERS);
  const [originalVisibleTiers, setOriginalVisibleTiers] = useState<number[]>(ALL_TIERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/tier-config');
        const data = await res.json();
        if (!cancelled && data.venue?.features) {
          setFeatures(data.venue.features);
          setOriginalFeatures(data.venue.features);
        }
        if (!cancelled && data.venue?.visible_tiers) {
          setVisibleTiers(data.venue.visible_tiers);
          setOriginalVisibleTiers(data.venue.visible_tiers);
        }
      } catch (err) {
        console.error('Failed to fetch tier config:', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleTierClick = (featureKey: string, tierIndex: number) => {
    setFeatures((prev) => {
      const current = prev[featureKey] ?? 0;
      if (current < 0) return { ...prev, [featureKey]: tierIndex };
      if (current === tierIndex) {
        if (tierIndex === 3) return { ...prev, [featureKey]: TIER_DISABLED };
        return { ...prev, [featureKey]: tierIndex + 1 };
      }
      return { ...prev, [featureKey]: tierIndex };
    });
    setDirty(true);
    setSaved(false);
  };

  const handleTierVisibilityToggle = (tierIndex: number) => {
    if (tierIndex === 0) return;
    setVisibleTiers((prev) => {
      const next = prev.includes(tierIndex)
        ? prev.filter((t) => t !== tierIndex)
        : [...prev, tierIndex].sort();
      return next;
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
        body: JSON.stringify({ entityType: 'venue', features, visibleTiers }),
      });
      if (res.ok) {
        setOriginalFeatures(features);
        setOriginalVisibleTiers(visibleTiers);
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
    setVisibleTiers(originalVisibleTiers);
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

  const categories = [...new Set(VENUE_FEATURES.map((f) => f.categoryKey))];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">{t('venueTiersTitle')}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('venueTiersDesc')}</p>
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
      <div className="overflow-x-auto no-scrollbar -mx-4 sm:mx-0">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className="text-left py-4 px-4 text-sm text-[var(--muted-foreground)] font-normal w-[40%]">
                {t('feature')}
              </th>
              {TIER_NAMES.map((name, i) => {
                const tierHidden = !visibleTiers.includes(i);
                const canToggle = i > 0;
                return (
                  <th key={name} className="py-4 px-2 text-center">
                    <button
                      onClick={() => canToggle && handleTierVisibilityToggle(i)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs tracking-wider uppercase font-semibold transition-all ${
                        tierHidden
                          ? 'bg-zinc-800/50 text-zinc-600 line-through opacity-50'
                          : `${TIER_BG[i]} ${TIER_COLORS[i]}`
                      } ${canToggle ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                      title={canToggle ? (tierHidden ? t('tierShowHint') : t('tierHideHint')) : undefined}
                    >
                      {tierHidden && (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                      {name}
                    </button>
                  </th>
                );
              })}
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
                {VENUE_FEATURES.filter((f) => f.categoryKey === cat).map((feat, fi) => {
                  const minTier = features[feat.key] ?? 0;
                  const disabled = minTier < 0;
                  const notImpl = NOT_IMPLEMENTED.has(feat.key);
                  return (
                    <tr
                      key={feat.key}
                      className={`${disabled ? 'opacity-40' : ''} ${notImpl ? 'opacity-60' : ''} ${fi % 2 === 0 ? 'bg-[var(--card)]/30' : ''} hover:bg-[var(--card)]/60 transition-colors`}
                    >
                      <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                        <span className={disabled ? 'line-through' : ''}>{t(feat.labelKey)}</span>
                        {disabled && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
                            {t('hidden')}
                          </span>
                        )}
                        {notImpl && (
                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                            {t('notImplemented')}
                          </span>
                        )}
                      </td>
                      {TIER_NAMES.map((_, tierIdx) => {
                        const unlocked = !disabled && tierIdx >= minTier;
                        return (
                          <td key={tierIdx} className="py-3 px-2 text-center">
                            {notImpl ? (
                              <span
                                className="w-8 h-8 rounded-lg inline-flex items-center justify-center bg-yellow-500/10 text-yellow-500/40 border border-yellow-500/20 cursor-not-allowed"
                                title={t('notImplementedHint')}
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm-1 9v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleTierClick(feat.key, tierIdx)}
                                className={`w-8 h-8 rounded-lg transition-all inline-flex items-center justify-center ${
                                  unlocked
                                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                                    : disabled
                                      ? 'bg-red-500/10 text-red-400/50 hover:bg-red-500/20 border border-red-500/20'
                                      : 'bg-zinc-800/50 text-zinc-600 hover:bg-zinc-700/50 border border-zinc-700/30'
                                }`}
                                title={disabled ? t('featureDisabledHint') : unlocked ? `Unlocked at Tier ${minTier}` : `Locked (requires Tier ${minTier})`}
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
                            )}
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

        {/* Hidden / disabled features */}
        {VENUE_FEATURES.filter((f) => (features[f.key] ?? 0) < 0).length > 0 && (
          <div className="space-y-3 pb-3 border-b border-[var(--border)]">
            <p className="text-xs uppercase tracking-widest text-red-400 font-semibold">{t('hiddenFeatures')}</p>
            {VENUE_FEATURES.filter((f) => (features[f.key] ?? 0) < 0).map((feat) => (
              <div key={feat.key} className="flex items-center gap-3 text-sm">
                <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
                  {t('hidden')}
                </span>
                <span className="text-[var(--muted-foreground)] line-through">{t(feat.labelKey)}</span>
                <span className="text-[var(--muted-foreground)] text-xs ml-auto">{t('hiddenMsg')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tier-locked features */}
        <div className="space-y-3">
          {VENUE_FEATURES.filter((f) => (features[f.key] ?? 0) > 0).map((feat) => {
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
