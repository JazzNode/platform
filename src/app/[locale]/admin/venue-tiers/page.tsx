'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';
import type { TierFeatures } from '@/components/TierConfigProvider';

const TIER_NAMES = ['Free', 'Claimed', 'Premium'];
const TIER_COLORS = [
  'text-zinc-400',
  'text-blue-400',
  'text-amber-400',
];
const TIER_BG = [
  'bg-zinc-500/10',
  'bg-blue-500/10',
  'bg-amber-500/10',
];

interface FeatureDef {
  key: string;
  label: string;
  category: string;
}

const VENUE_FEATURES: FeatureDef[] = [
  // Profile & Identity
  { key: 'public_listing', label: 'Public venue listing', category: 'Profile & Identity' },
  { key: 'edit_profile', label: 'Edit description, photos & hours', category: 'Profile & Identity' },
  { key: 'verified_badge', label: 'Verified badge', category: 'Profile & Identity' },
  { key: 'photos', label: 'Photo gallery', category: 'Profile & Identity' },
  { key: 'description', label: 'Custom description', category: 'Profile & Identity' },
  // Discovery & Visibility
  { key: 'search_listing', label: 'Listed in search & city pages', category: 'Discovery & Visibility' },
  { key: 'map_pin', label: 'Map pin on city page', category: 'Discovery & Visibility' },
  { key: 'priority_search', label: 'Priority in search results', category: 'Discovery & Visibility' },
  { key: 'event_showcase', label: 'Event listings on venue page', category: 'Discovery & Visibility' },
  // Tools & Analytics
  { key: 'backline', label: 'Backline equipment management', category: 'Tools & Analytics' },
  { key: 'analytics_basic', label: 'Page views & daily trends', category: 'Tools & Analytics' },
  { key: 'analytics_advanced', label: 'Referrer sources & city breakdown', category: 'Tools & Analytics' },
  { key: 'broadcasts', label: 'Fan broadcasts', category: 'Tools & Analytics' },
  { key: 'inbox', label: 'Messaging inbox', category: 'Tools & Analytics' },
  // Business & Operations
  { key: 'booking_management', label: 'Booking management system', category: 'Business & Operations' },
  { key: 'artist_discovery', label: 'Artist discovery & outreach', category: 'Business & Operations' },
];

export default function VenueTiersPage() {
  const { token } = useAdmin();
  const t = useTranslations('adminHQ');
  const [features, setFeatures] = useState<TierFeatures>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tier-config');
      const data = await res.json();
      if (data.venue?.features) setFeatures(data.venue.features);
    } catch (err) {
      console.error('Failed to fetch tier config:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleTierClick = (featureKey: string, tierIndex: number) => {
    setFeatures((prev) => {
      const current = prev[featureKey] ?? 0;
      const newVal = current === tierIndex ? tierIndex + 1 : tierIndex;
      return { ...prev, [featureKey]: Math.min(newVal, 2) }; // max tier 2 for venues
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
        body: JSON.stringify({ entityType: 'venue', features }),
      });
      if (res.ok) {
        setSaved(true);
        setDirty(false);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const categories = [...new Set(VENUE_FEATURES.map((f) => f.category))];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">{t('venueTiersTitle')}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('venueTiersDesc')}</p>
        </div>
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

      {/* Hint */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 text-sm text-[var(--muted-foreground)]">
        <p>{t('tierConfigHint')}</p>
      </div>

      {/* Interactive Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[540px] border-collapse">
          <thead>
            <tr>
              <th className="text-left py-4 px-4 text-sm text-[var(--muted-foreground)] font-normal w-[45%]">
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
                    colSpan={4}
                    className="pt-6 pb-2 px-4 text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-semibold border-b border-[var(--border)]"
                  >
                    {cat}
                  </td>
                </tr>
                {VENUE_FEATURES.filter((f) => f.category === cat).map((feat, fi) => {
                  const minTier = features[feat.key] ?? 0;
                  return (
                    <tr
                      key={feat.key}
                      className={`${fi % 2 === 0 ? 'bg-[var(--card)]/30' : ''} hover:bg-[var(--card)]/60 transition-colors`}
                    >
                      <td className="py-3 px-4 text-sm text-[var(--foreground)]">{feat.label}</td>
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
          {VENUE_FEATURES.filter((f) => (features[f.key] ?? 0) > 0).map((feat) => {
            const min = features[feat.key] ?? 0;
            return (
              <div key={feat.key} className="flex items-center gap-3 text-sm">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${TIER_BG[min]} ${TIER_COLORS[min]}`}>
                  {TIER_NAMES[min]}+
                </span>
                <span className="text-[var(--foreground)]">{feat.label}</span>
                <span className="text-[var(--muted-foreground)] text-xs ml-auto">
                  {min === 1 ? t('lockMsgClaim') : t('lockMsgPremium')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
