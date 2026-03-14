'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type TierFeatures = Record<string, number>;

interface TierConfigContextType {
  /** Artist feature config: feature_key → min tier required */
  artistFeatures: TierFeatures;
  /** Venue feature config: feature_key → min tier required */
  venueFeatures: TierFeatures;
  /** Check if a feature is unlocked for a given entity tier */
  isUnlocked: (entityType: 'artist' | 'venue', featureKey: string, currentTier: number) => boolean;
  /** Get the min tier required for a feature */
  minTier: (entityType: 'artist' | 'venue', featureKey: string) => number;
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
  // Tier 1 (Claimed) — edit rights + identity
  edit_profile: 1, verified_badge: 1, custom_bio: 1, social_links: 1,
  teaching_section: 1, gear_showcase: 1, epk_basic: 1, analytics_basic: 1,
  // Tier 2 (Premium) — proactive reach + full analytics
  broadcasts: 2, featured_wall: 2, inbox: 2, available_for_hire: 2,
  analytics_advanced: 2, epk_full: 2, gear_unlimited: 2, priority_search: 2,
  // Tier 3 (Elite) — brand independence + business tools
  custom_domain: 3, custom_theme: 3, broadcasts_unlimited: 3,
  booking_requests: 3, epk_branded_pdf: 3, spotlight: 3, data_export: 3,
};

const DEFAULT_VENUE: TierFeatures = {
  // Tier 0 — full public venue guide
  public_listing: 0, search_listing: 0, map_pin: 0, event_showcase: 0, venue_tags: 0,
  // Tier 1 (Claimed) — edit rights + identity
  edit_profile: 1, verified_badge: 1, photos: 1, description: 1,
  // Tier 2 (Premium) — operational tools
  schedule_manager: 2, backline: 2, analytics_basic: 2, analytics_advanced: 2,
  inbox: 2, artist_discovery: 2, broadcasts: 2, priority_search: 2,
  // Tier 3 (Elite) — business engine
  custom_domain: 3, custom_theme: 3, ticketing: 3, broadcasts_unlimited: 3,
  booking_management: 3, revenue_analytics: 3, multi_location: 3, ical_api: 3,
};

export default function TierConfigProvider({ children }: { children: React.ReactNode }) {
  const [artistFeatures, setArtistFeatures] = useState<TierFeatures>(DEFAULT_ARTIST);
  const [venueFeatures, setVenueFeatures] = useState<TierFeatures>(DEFAULT_VENUE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/admin/tier-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.artist?.features) setArtistFeatures(data.artist.features);
        if (data.venue?.features) setVenueFeatures(data.venue.features);
        setLoaded(true);
      })
      .catch(() => {
        // Fall back to defaults
        setLoaded(true);
      });
  }, []);

  const isUnlocked = useCallback(
    (entityType: 'artist' | 'venue', featureKey: string, currentTier: number) => {
      const features = entityType === 'artist' ? artistFeatures : venueFeatures;
      const required = features[featureKey];
      if (required === undefined) return true; // unknown feature → allow
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

  return (
    <TierConfigContext.Provider value={{ artistFeatures, venueFeatures, isUnlocked, minTier, loaded }}>
      {children}
    </TierConfigContext.Provider>
  );
}

export function useTierConfig() {
  const ctx = useContext(TierConfigContext);
  if (!ctx) throw new Error('useTierConfig must be used within TierConfigProvider');
  return ctx;
}
