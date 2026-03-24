import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import TierSectionSwitch from '@/components/tiers/TierSectionSwitch';
import type { SectionData } from '@/components/tiers/TierSectionSwitch';
import type { TierFeatures } from '@/components/TierConfigProvider';

// Re-fetch tier config every 60s so admin changes propagate quickly
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tiers' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

/* ─── Default features (fallback + admin full-view source for disabled features) ─── */
const DEFAULT_ARTIST: TierFeatures = {
  public_profile: 0, search_listing: 0, event_association: 0,
  collaboration_graph: 0, follower_count_display: 0, tags_badges: 0, performance_history: 0,
  edit_profile: 1, verified_badge: 1, custom_bio: 1, social_links: 1,
  teaching_section: 1, gear_showcase: 1, epk_basic: 1, analytics_basic: 1, inbox: 1,
  broadcasts: 2, featured_wall: 2, available_for_hire: 2,
  analytics_advanced: 2, epk_full: 2, gear_unlimited: 2, priority_search: 2,
  custom_domain: 3, custom_theme: 3, broadcasts_unlimited: 3,
  booking_requests: 3, epk_branded_pdf: 3, spotlight: 3, data_export: 3,
};
const DEFAULT_VENUE: TierFeatures = {
  public_listing: 0, search_listing: 0, map_pin: 0, event_showcase: 0, venue_tags: 0,
  edit_profile: 1, verified_badge: 1, photos: 1, description: 1, inbox: 1,
  schedule_manager: 2, backline: 2, analytics_basic: 2, analytics_advanced: 2,
  artist_discovery: 2, broadcasts: 2, priority_search: 2,
  custom_domain: 3, custom_theme: 3, ticketing: 3, broadcasts_unlimited: 3,
  booking_management: 3, revenue_analytics: 3, multi_location: 3, ical_api: 3,
};
const ALL_TIERS = [0, 1, 2, 3];

/* ─── Fetch tier config from Supabase ─── */
async function fetchTierConfig(): Promise<{
  artist: TierFeatures; venue: TierFeatures;
  artistVisibleTiers: number[]; venueVisibleTiers: number[];
}> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('tier_config').select('entity_type, features, visible_tiers');
    if (!data) return { artist: DEFAULT_ARTIST, venue: DEFAULT_VENUE, artistVisibleTiers: ALL_TIERS, venueVisibleTiers: ALL_TIERS };
    const artistRow = data.find((r) => r.entity_type === 'artist');
    const venueRow = data.find((r) => r.entity_type === 'venue');
    return {
      artist: artistRow?.features ?? DEFAULT_ARTIST,
      venue: venueRow?.features ?? DEFAULT_VENUE,
      artistVisibleTiers: (artistRow?.visible_tiers as number[]) ?? ALL_TIERS,
      venueVisibleTiers: (venueRow?.visible_tiers as number[]) ?? ALL_TIERS,
    };
  } catch {
    return { artist: DEFAULT_ARTIST, venue: DEFAULT_VENUE, artistVisibleTiers: ALL_TIERS, venueVisibleTiers: ALL_TIERS };
  }
}

/* ─── Helper: convert minTier → display array filtered by visible tiers ─── */
function tierRow(cfg: TierFeatures, key: string, visible: number[]): (boolean | string)[] {
  const min = cfg[key] ?? 0;
  if (min < 0) return []; // disabled feature
  const row = visible.map((tier) => tier >= min);
  if (!row.some(Boolean)) return [];
  return row;
}

/* ─── Build section data for a given entity type ─── */
function buildArtistSection(
  features: TierFeatures,
  visible: number[],
  t: (key: string) => string,
): SectionData {
  const allColumns = [t('free'), t('claimed'), t('premium'), t('elite')];
  const allColors = [
    'bg-zinc-500/20 text-zinc-400',
    'bg-blue-500/20 text-blue-400',
    'bg-amber-500/20 text-amber-400',
    'bg-purple-500/20 text-purple-400',
  ];

  const gearRow: (boolean | string)[] = (() => {
    const row = visible.map((i) => {
      if (i >= (features.gear_unlimited ?? 2)) return t('artistGearUnlimited');
      if (i >= (features.gear_showcase ?? 1)) return t('artistGearLimit');
      return false;
    });
    return row.every((v) => v === false) ? [] : row;
  })();

  const epkRow: (boolean | string)[] = (() => {
    const row = visible.map((i) => {
      if (i >= (features.epk_branded_pdf ?? 3)) return t('artistEPKBranded');
      if (i >= (features.epk_full ?? 2)) return t('artistEPKFull');
      if (i >= (features.epk_basic ?? 1)) return t('artistEPKBasic');
      return false;
    });
    return row.every((v) => v === false) ? [] : row;
  })();

  const broadcastRow: (boolean | string)[] = (() => {
    const row = visible.map((i) => {
      if (i >= (features.broadcasts_unlimited ?? 3)) return t('broadcastsUnlimited');
      if (i >= (features.broadcasts ?? 2)) return t('broadcastsLimited');
      return false;
    });
    return row.every((v) => v === false) ? [] : row;
  })();

  return {
    columns: visible.map((i) => allColumns[i]),
    colors: visible.map((i) => allColors[i]),
    highlight: visible.indexOf(2),
    cards: [
      { tier: 0, label: t('free'), sub: t('artistTier0Desc'), color: 'border-zinc-600 bg-zinc-800/50', tagColor: 'text-zinc-400', tag: 'Tier 0' },
      { tier: 1, label: t('claimed'), sub: t('artistTier1Desc'), color: 'border-blue-600 bg-blue-900/30', tagColor: 'text-blue-400', tag: 'Tier 1' },
      { tier: 2, label: t('premium'), sub: t('artistTier2Desc'), color: 'border-amber-500 bg-amber-900/25 ring-1 ring-amber-500/30', tagColor: 'text-amber-400', tag: 'Tier 2' },
      { tier: 3, label: t('elite'), sub: t('artistTier3Desc'), color: 'border-purple-600 bg-purple-900/25', tagColor: 'text-purple-400', tag: 'Tier 3' },
    ].filter((c) => visible.includes(c.tier)).map(({ tier: _t, ...rest }) => rest),
    features: [
      {
        category: t('artistCatFanFacing'),
        items: [
          { name: t('artistPublicProfile'), desc: t('artistPublicProfileDesc'), tiers: tierRow(features, 'public_profile', visible) },
          { name: t('artistSearchListing'), desc: t('artistSearchListingDesc'), tiers: tierRow(features, 'search_listing', visible) },
          { name: t('artistEventAssociation'), desc: t('artistEventAssociationDesc'), tiers: tierRow(features, 'event_association', visible) },
          { name: t('artistCollaborationGraph'), desc: t('artistCollaborationGraphDesc'), tiers: tierRow(features, 'collaboration_graph', visible) },
          { name: t('artistFollowerCount'), tiers: tierRow(features, 'follower_count_display', visible) },
          { name: t('artistTagsBadges'), tiers: tierRow(features, 'tags_badges', visible) },
          { name: t('artistPerformanceHistory'), desc: t('artistPerformanceHistoryDesc'), tiers: tierRow(features, 'performance_history', visible) },
        ],
      },
      {
        category: t('artistCatClaimed'),
        items: [
          { name: t('artistEditProfile'), desc: t('artistEditProfileDesc'), tiers: tierRow(features, 'edit_profile', visible) },
          { name: t('artistVerifiedBadge'), desc: t('artistVerifiedBadgeDesc'), tiers: tierRow(features, 'verified_badge', visible) },
          { name: t('artistCustomBio'), tiers: tierRow(features, 'custom_bio', visible) },
          { name: t('artistSocialLinks'), tiers: tierRow(features, 'social_links', visible) },
          { name: t('artistTeachingSection'), desc: t('artistTeachingSectionDesc'), tiers: tierRow(features, 'teaching_section', visible) },
          { name: t('artistGearShowcase'), tiers: gearRow },
          { name: t('artistEPK'), tiers: epkRow },
          { name: t('artistAnalyticsBasic'), desc: t('artistAnalyticsBasicDesc'), tiers: tierRow(features, 'analytics_basic', visible) },
          { name: t('artistInbox'), desc: t('artistInboxDesc'), tiers: tierRow(features, 'inbox', visible) },
        ],
      },
      {
        category: t('artistCatPremium'),
        items: [
          { name: t('artistBroadcasts'), desc: t('artistBroadcastsDesc'), tiers: broadcastRow },
          { name: t('artistFeaturedWall'), desc: t('artistFeaturedWallDesc'), tiers: tierRow(features, 'featured_wall', visible) },
          { name: t('artistAvailableForHire'), desc: t('artistAvailableForHireDesc'), tiers: tierRow(features, 'available_for_hire', visible) },
          { name: t('artistAnalyticsAdvanced'), desc: t('artistAnalyticsAdvancedDesc'), tiers: tierRow(features, 'analytics_advanced', visible) },
          { name: t('artistPrioritySearch'), desc: t('artistPrioritySearchDesc'), tiers: tierRow(features, 'priority_search', visible) },
        ],
      },
      {
        category: t('artistCatElite'),
        items: [
          { name: t('artistCustomDomain'), desc: t('artistCustomDomainDesc'), tiers: tierRow(features, 'custom_domain', visible) },
          { name: t('artistCustomTheme'), desc: t('artistCustomThemeDesc'), tiers: tierRow(features, 'custom_theme', visible) },
          { name: t('artistBookingRequests'), desc: t('artistBookingRequestsDesc'), tiers: tierRow(features, 'booking_requests', visible) },
          { name: t('artistSpotlight'), desc: t('artistSpotlightDesc'), tiers: tierRow(features, 'spotlight', visible) },
          { name: t('artistDataExport'), desc: t('artistDataExportDesc'), tiers: tierRow(features, 'data_export', visible) },
        ],
      },
    ],
  };
}

function buildVenueSection(
  features: TierFeatures,
  visible: number[],
  t: (key: string) => string,
): SectionData {
  const allColumns = [t('free'), t('claimed'), t('premium'), t('elite')];
  const allColors = [
    'bg-zinc-500/20 text-zinc-400',
    'bg-blue-500/20 text-blue-400',
    'bg-amber-500/20 text-amber-400',
    'bg-purple-500/20 text-purple-400',
  ];

  const broadcastRow: (boolean | string)[] = (() => {
    const row = visible.map((i) => {
      if (i >= (features.broadcasts_unlimited ?? 3)) return t('broadcastsUnlimited');
      if (i >= (features.broadcasts ?? 2)) return t('broadcastsLimited');
      return false;
    });
    return row.every((v) => v === false) ? [] : row;
  })();

  return {
    columns: visible.map((i) => allColumns[i]),
    colors: visible.map((i) => allColors[i]),
    highlight: visible.indexOf(2),
    cards: [
      { tier: 0, label: t('free'), sub: t('venueTier0Desc'), color: 'border-zinc-600 bg-zinc-800/50', tagColor: 'text-zinc-400', tag: 'Tier 0' },
      { tier: 1, label: t('claimed'), sub: t('venueTier1Desc'), color: 'border-blue-600 bg-blue-900/30', tagColor: 'text-blue-400', tag: 'Tier 1' },
      { tier: 2, label: t('premium'), sub: t('venueTier2Desc'), color: 'border-amber-500 bg-amber-900/25 ring-1 ring-amber-500/30', tagColor: 'text-amber-400', tag: 'Tier 2' },
      { tier: 3, label: t('elite'), sub: t('venueTier3Desc'), color: 'border-purple-600 bg-purple-900/25', tagColor: 'text-purple-400', tag: 'Tier 3' },
    ].filter((c) => visible.includes(c.tier)).map(({ tier: _t, ...rest }) => rest),
    features: [
      {
        category: t('venueCatFanFacing'),
        items: [
          { name: t('venuePublicListing'), desc: t('venuePublicListingDesc'), tiers: tierRow(features, 'public_listing', visible) },
          { name: t('venueSearchListing'), desc: t('venueSearchListingDesc'), tiers: tierRow(features, 'search_listing', visible) },
          { name: t('venueMapPin'), desc: t('venueMapPinDesc'), tiers: tierRow(features, 'map_pin', visible) },
          { name: t('venueEventShowcase'), desc: t('venueEventShowcaseDesc'), tiers: tierRow(features, 'event_showcase', visible) },
          { name: t('venueVenueTags'), desc: t('venueVenueTagsDesc'), tiers: tierRow(features, 'venue_tags', visible) },
        ],
      },
      {
        category: t('venueCatClaimed'),
        items: [
          { name: t('venueEditProfile'), desc: t('venueEditProfileDesc'), tiers: tierRow(features, 'edit_profile', visible) },
          { name: t('venueVerifiedBadge'), desc: t('venueVerifiedBadgeDesc'), tiers: tierRow(features, 'verified_badge', visible) },
          { name: t('venuePhotos'), desc: t('venuePhotosDesc'), tiers: tierRow(features, 'photos', visible) },
          { name: t('venueDescription'), tiers: tierRow(features, 'description', visible) },
          { name: t('venueInbox'), desc: t('venueInboxDesc'), tiers: tierRow(features, 'inbox', visible) },
        ],
      },
      {
        category: t('venueCatPremium'),
        items: [
          { name: t('venueScheduleManager'), desc: t('venueScheduleManagerDesc'), tiers: tierRow(features, 'schedule_manager', visible) },
          { name: t('venueBackline'), desc: t('venueBacklineDesc'), tiers: tierRow(features, 'backline', visible) },
          { name: t('venueAnalyticsBasic'), desc: t('venueAnalyticsBasicDesc'), tiers: tierRow(features, 'analytics_basic', visible) },
          { name: t('venueAnalyticsAdvanced'), desc: t('venueAnalyticsAdvancedDesc'), tiers: tierRow(features, 'analytics_advanced', visible) },
          { name: t('venueBroadcasts'), desc: t('venueBroadcastsDesc'), tiers: broadcastRow },
          { name: t('venuePrioritySearch'), desc: t('venuePrioritySearchDesc'), tiers: tierRow(features, 'priority_search', visible) },
        ],
      },
      {
        category: t('venueCatElite'),
        items: [
          { name: t('venueCustomDomain'), desc: t('venueCustomDomainDesc'), tiers: tierRow(features, 'custom_domain', visible) },
          { name: t('venueCustomTheme'), desc: t('venueCustomThemeDesc'), tiers: tierRow(features, 'custom_theme', visible) },
          { name: t('venueTicketing'), desc: t('venueTicketingDesc'), tiers: tierRow(features, 'ticketing', visible) },
          { name: t('venueRevenueAnalytics'), desc: t('venueRevenueAnalyticsDesc'), tiers: tierRow(features, 'revenue_analytics', visible) },
          { name: t('venueMultiLocation'), desc: t('venueMultiLocationDesc'), tiers: tierRow(features, 'multi_location', visible) },
          { name: t('venueIcalApi'), desc: t('venueIcalApiDesc'), tiers: tierRow(features, 'ical_api', visible) },
        ],
      },
    ],
  };
}

/** Resolve disabled features (-1) back to their default tier values */
function resolveDisabled(features: TierFeatures, defaults: TierFeatures): TierFeatures {
  const resolved = { ...features };
  for (const key in resolved) {
    if (resolved[key] < 0) {
      resolved[key] = defaults[key] ?? 0;
    }
  }
  return resolved;
}

export default async function TiersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tiers' });
  const cfg = await fetchTierConfig();

  /* ─── Filtered (public view): respects visible_tiers + disabled features ─── */
  const filteredArtist = buildArtistSection(cfg.artist, cfg.artistVisibleTiers, t);
  const filteredVenue = buildVenueSection(cfg.venue, cfg.venueVisibleTiers, t);

  /* ─── Full (admin view): all tiers visible, disabled features restored to defaults ─── */
  const fullArtist = buildArtistSection(resolveDisabled(cfg.artist, DEFAULT_ARTIST), ALL_TIERS, t);
  const fullVenue = buildVenueSection(resolveDisabled(cfg.venue, DEFAULT_VENUE), ALL_TIERS, t);

  return (
    <div className="space-y-20">
      {/* ─── Hero ─── */}
      <FadeUp>
        <section className="pt-16 pb-8 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] leading-tight">
            {t('heroTitle')}
          </h1>
          <p className="mt-4 text-lg text-zinc-300 max-w-xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>
        </section>
      </FadeUp>

      {/* ─── Artist Tiers ─── */}
      <FadeUpItem>
        <TierSectionSwitch
          title={t('artistSectionTitle')}
          desc={t('artistSectionDesc')}
          filtered={filteredArtist}
          full={fullArtist}
        />
      </FadeUpItem>

      {/* ─── Venue Tiers ─── */}
      <FadeUpItem delay={100}>
        <TierSectionSwitch
          title={t('venueSectionTitle')}
          desc={t('venueSectionDesc')}
          filtered={filteredVenue}
          full={fullVenue}
        />
      </FadeUpItem>

      {/* ─── CTA ─── */}
      <FadeUpItem delay={200}>
        <section className="text-center py-12 border-t border-[var(--border)]">
          <h3 className="text-2xl font-bold text-[var(--foreground)] mb-3">
            {t('ctaTitle')}
          </h3>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            {t('ctaDesc')}
          </p>
          <a
            href={`/${locale}/artists`}
            className="inline-block px-6 py-3 rounded-lg bg-gold text-black font-semibold text-sm hover:bg-gold/90 transition-colors"
          >
            {t('ctaButton')}
          </a>
        </section>
      </FadeUpItem>
    </div>
  );
}
