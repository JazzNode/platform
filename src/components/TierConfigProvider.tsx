'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type TierFeatures = Record<string, number>;

/** Sentinel value: feature is disabled / hidden from all tiers */
export const TIER_DISABLED = -1;

/** Default: all 4 tiers visible */
export const ALL_TIERS = [0, 1, 2, 3];

interface TierConfigContextType {
  /** Artist feature config: feature_key → min tier required (-1 = disabled) */
  artistFeatures: TierFeatures;
  /** Venue feature config: feature_key → min tier required (-1 = disabled) */
  venueFeatures: TierFeatures;
  /** Which tiers are publicly visible for artists */
  artistVisibleTiers: number[];
  /** Which tiers are publicly visible for venues */
  venueVisibleTiers: number[];
  /** Check if a feature is unlocked for a given entity tier. Pass adminBypass=true to bypass disabled state. */
  isUnlocked: (entityType: 'artist' | 'venue', featureKey: string, currentTier: number, adminBypass?: boolean) => boolean;
  /** Get the min tier required for a feature (-1 = disabled) */
  minTier: (entityType: 'artist' | 'venue', featureKey: string) => number;
  /** Check if a feature is enabled (not disabled via dashboard) */
  isFeatureEnabled: (entityType: 'artist' | 'venue', featureKey: string) => boolean;
  /** Check if a specific tier is publicly visible */
  isTierVisible: (entityType: 'artist' | 'venue', tier: number) => boolean;
  /** Whether config has loaded */
  loaded: boolean;
}

const TierConfigContext = createContext<TierConfigContextType | null>(null);

// Default configs matching the seed data — used before API response arrives
// Philosophy: fan-facing (Tier 0) is always complete; tiers only gate creator backend tools
const DEFAULT_ARTIST: TierFeatures = {
  // Tier 0 — full public presence, zero gating
  public_profile: 0, search_listing: 0, event_association: 0,
  collaboration_graph: 0, follower_count_display: 0, tags_badges: 0, performance_history: 0,
  social_links: 0,
  // Tier 1 (Claimed) — edit rights + identity + inbox
  edit_profile: 1, verified_badge: 1, custom_bio: 1,
  teaching_section: 1, gear_showcase: 1, epk_basic: 1, analytics_basic: 1, inbox: 1,
  // Tier 2 (Pro) — reach + basic analytics + AI translation
  broadcasts: 2, featured_wall: 2, available_for_hire: 2,
  epk_full: 2, gear_unlimited: 2, ai_translation: 2,
  // Tier 3 (Elite) — deep insights + brand customization
  analytics_advanced: 3, fan_insights: 3, post_show_recap: 3, weekly_digest: 3,
  fan_crm: 3, collaboration_insights: 3, seo_insights: 3,
  custom_domain: 3, custom_theme: 3, brand_theme: 3,
  custom_cta: 3, custom_slug: 3, custom_og: 3, calendar_feed: 3,
  broadcasts_unlimited: 3, monthly_ai_summary: 3,
  epk_branded_pdf: 3, spotlight: 3, data_export: 3,
};

const DEFAULT_VENUE: TierFeatures = {
  // Tier 0 — full public venue guide
  public_listing: 0, search_listing: 0, map_pin: 0, event_showcase: 0, venue_tags: 0,
  // Tier 1 (Claimed) — edit rights + identity + inbox
  edit_profile: 1, verified_badge: 1, photos: 1, description: 1, inbox: 1,
  // Tier 2 (Premium) — operational tools
  schedule_manager: 2, backline: 2, analytics_basic: 2, analytics_advanced: 2,
  broadcasts: 2, announcements: 2, merchandise: 2, embed_calendar: 2, priority_search: 2,
  fan_insights: 2, post_show_recap: 2, artist_recommendations: 2,
  weekly_digest: 2,
  // Tier 3 (Elite) — business engine + brand customization
  custom_domain: 3, custom_theme: 3, custom_slug: 3, custom_og: 3,
  seo_insights: 3, monthly_ai_summary: 3, calendar_feed: 3,
  vip_support: 3, ticketing: 3, broadcasts_unlimited: 3,
  revenue_analytics: 3, multi_location: 3,
};

export default function TierConfigProvider({ children }: { children: React.ReactNode }) {
  const [artistFeatures, setArtistFeatures] = useState<TierFeatures>(DEFAULT_ARTIST);
  const [venueFeatures, setVenueFeatures] = useState<TierFeatures>(DEFAULT_VENUE);
  const [artistVisibleTiers, setArtistVisibleTiers] = useState<number[]>(ALL_TIERS);
  const [venueVisibleTiers, setVenueVisibleTiers] = useState<number[]>(ALL_TIERS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/admin/tier-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.artist?.features) setArtistFeatures(data.artist.features);
        if (data.venue?.features) setVenueFeatures(data.venue.features);
        if (data.artist?.visible_tiers) setArtistVisibleTiers(data.artist.visible_tiers);
        if (data.venue?.visible_tiers) setVenueVisibleTiers(data.venue.visible_tiers);
        setLoaded(true);
      })
      .catch(() => {
        // Fall back to defaults
        setLoaded(true);
      });
  }, []);

  const isUnlocked = useCallback(
    (entityType: 'artist' | 'venue', featureKey: string, currentTier: number, adminBypass = false) => {
      const features = entityType === 'artist' ? artistFeatures : venueFeatures;
      const required = features[featureKey];
      if (required === undefined) return true; // unknown feature → allow
      if (required < 0) return adminBypass; // disabled feature — only admin can see
      return currentTier >= required;
    },
    [artistFeatures, venueFeatures],
  );

  const minTier = useCallback(
    (entityType: 'artist' | 'venue', featureKey: string) => {
      const features = entityType === 'artist' ? artistFeatures : venueFeatures;
      return features[featureKey] ?? 0;
    },
    [artistFeatures, venueFeatures],
  );

  const isFeatureEnabled = useCallback(
    (entityType: 'artist' | 'venue', featureKey: string) => {
      const features = entityType === 'artist' ? artistFeatures : venueFeatures;
      const required = features[featureKey];
      return required === undefined || required >= 0;
    },
    [artistFeatures, venueFeatures],
  );

  const isTierVisible = useCallback(
    (entityType: 'artist' | 'venue', tier: number) => {
      const visible = entityType === 'artist' ? artistVisibleTiers : venueVisibleTiers;
      return visible.includes(tier);
    },
    [artistVisibleTiers, venueVisibleTiers],
  );

  return (
    <TierConfigContext.Provider value={{
      artistFeatures, venueFeatures,
      artistVisibleTiers, venueVisibleTiers,
      isUnlocked, minTier, isFeatureEnabled, isTierVisible,
      loaded,
    }}>
      {children}
    </TierConfigContext.Provider>
  );
}

export function useTierConfig() {
  const ctx = useContext(TierConfigContext);
  if (!ctx) throw new Error('useTierConfig must be used within TierConfigProvider');
  return ctx;
}
