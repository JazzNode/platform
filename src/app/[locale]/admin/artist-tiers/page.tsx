'use client';

import TierConfigTable, { type FeatureKey } from '@/components/tiers/TierConfigTable';

/** Features listed in the tier config but not yet built in the frontend */
const NOT_IMPLEMENTED = new Set([
  'collaboration_graph',
  'featured_wall',
  'epk_basic',
  'epk_full',
  'priority_search',
  'custom_domain',
  'custom_theme',
  'epk_branded_pdf',
  'spotlight',
  'data_export',
]);

const ARTIST_FEATURES: FeatureKey[] = [
  // Tier 0 — Fan-facing (always visible)
  { key: 'public_profile', labelKey: 'af_publicProfile', descKey: 'af_publicProfileDesc', categoryKey: 'ac_fanFacing' },
  { key: 'search_listing', labelKey: 'af_searchListing', descKey: 'af_searchListingDesc', categoryKey: 'ac_fanFacing' },
  { key: 'event_association', labelKey: 'af_eventAssociation', descKey: 'af_eventAssociationDesc', categoryKey: 'ac_fanFacing' },
  { key: 'collaboration_graph', labelKey: 'af_collaborationGraph', descKey: 'af_collaborationGraphDesc', categoryKey: 'ac_fanFacing' },
  { key: 'follower_count_display', labelKey: 'af_followerCountDisplay', categoryKey: 'ac_fanFacing' },
  { key: 'tags_badges', labelKey: 'af_tagsBadges', categoryKey: 'ac_fanFacing' },
  { key: 'performance_history', labelKey: 'af_performanceHistory', descKey: 'af_performanceHistoryDesc', categoryKey: 'ac_fanFacing' },
  // Tier 1 — Claimed (edit rights + identity)
  { key: 'edit_profile', labelKey: 'af_editProfile', descKey: 'af_editProfileDesc', categoryKey: 'ac_claimed' },
  { key: 'verified_badge', labelKey: 'af_verifiedBadge', descKey: 'af_verifiedBadgeDesc', categoryKey: 'ac_claimed' },
  { key: 'custom_bio', labelKey: 'af_customBio', categoryKey: 'ac_claimed' },
  { key: 'social_links', labelKey: 'af_socialLinks', categoryKey: 'ac_claimed' },
  { key: 'teaching_section', labelKey: 'af_teachingSection', descKey: 'af_teachingSectionDesc', categoryKey: 'ac_claimed' },
  { key: 'gear_showcase', labelKey: 'af_gearLimited', categoryKey: 'ac_claimed' },
  { key: 'epk_basic', labelKey: 'af_epkBasic', categoryKey: 'ac_claimed' },
  { key: 'analytics_basic', labelKey: 'af_analyticsBasic', descKey: 'af_analyticsBasicDesc', categoryKey: 'ac_claimed' },
  { key: 'inbox', labelKey: 'af_inbox', descKey: 'af_inboxDesc', categoryKey: 'ac_claimed' },
  // Tier 2 — Premium (proactive reach)
  { key: 'broadcasts', labelKey: 'af_broadcasts', descKey: 'af_broadcastsDesc', categoryKey: 'ac_premium' },
  { key: 'featured_wall', labelKey: 'af_featuredWall', descKey: 'af_featuredWallDesc', categoryKey: 'ac_premium' },
  { key: 'available_for_hire', labelKey: 'af_availableForHire', descKey: 'af_availableForHireDesc', categoryKey: 'ac_premium' },
  { key: 'analytics_advanced', labelKey: 'af_analyticsAdvanced', descKey: 'af_analyticsAdvancedDesc', categoryKey: 'ac_premium' },
  { key: 'epk_full', labelKey: 'af_epkFull', categoryKey: 'ac_premium' },
  { key: 'gear_unlimited', labelKey: 'af_gearUnlimited', categoryKey: 'ac_premium' },
  { key: 'priority_search', labelKey: 'af_prioritySearch', descKey: 'af_prioritySearchDesc', categoryKey: 'ac_premium' },
  { key: 'fan_insights', labelKey: 'af_fanInsights', descKey: 'af_fanInsightsDesc', categoryKey: 'ac_premium' },
  { key: 'post_show_recap', labelKey: 'af_postShowRecap', descKey: 'af_postShowRecapDesc', categoryKey: 'ac_premium' },
  { key: 'weekly_digest', labelKey: 'af_weeklyDigest', descKey: 'af_weeklyDigestDesc', categoryKey: 'ac_premium' },
  // Tier 3 — Elite (brand independence)
  { key: 'custom_domain', labelKey: 'af_customDomain', descKey: 'af_customDomainDesc', categoryKey: 'ac_elite' },
  { key: 'custom_theme', labelKey: 'af_customTheme', descKey: 'af_customThemeDesc', categoryKey: 'ac_elite' },
  { key: 'broadcasts_unlimited', labelKey: 'af_broadcastsUnlimited', categoryKey: 'ac_elite' },
  { key: 'booking_requests', labelKey: 'af_bookingRequests', descKey: 'af_bookingRequestsDesc', categoryKey: 'ac_elite' },
  { key: 'epk_branded_pdf', labelKey: 'af_epkBrandedPdf', categoryKey: 'ac_elite' },
  { key: 'spotlight', labelKey: 'af_spotlight', descKey: 'af_spotlightDesc', categoryKey: 'ac_elite' },
  { key: 'data_export', labelKey: 'af_dataExport', descKey: 'af_dataExportDesc', categoryKey: 'ac_elite' },
];

export default function ArtistTiersPage() {
  return (
    <TierConfigTable
      entityType="artist"
      features={ARTIST_FEATURES}
      notImplemented={NOT_IMPLEMENTED}
      titleKey="artistTiersTitle"
      descKey="artistTiersDesc"
    />
  );
}
