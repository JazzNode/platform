'use client';

import TierConfigTable, { type FeatureKey } from '@/components/tiers/TierConfigTable';

/** Features listed in the tier config but not yet built in the frontend */
const NOT_IMPLEMENTED = new Set([
  'backline',
  'priority_search',
  'ticketing',
  'revenue_analytics',
  'multi_location',
]);

const VENUE_FEATURES: FeatureKey[] = [
  // Tier 0 — Fan-facing (always visible)
  { key: 'public_listing', labelKey: 'vf_publicListing', descKey: 'vf_publicListingDesc', categoryKey: 'vc_fanFacing' },
  { key: 'search_listing', labelKey: 'vf_searchListing', descKey: 'vf_searchListingDesc', categoryKey: 'vc_fanFacing' },
  { key: 'map_pin', labelKey: 'vf_mapPin', descKey: 'vf_mapPinDesc', categoryKey: 'vc_fanFacing' },
  { key: 'event_showcase', labelKey: 'vf_eventShowcase', descKey: 'vf_eventShowcaseDesc', categoryKey: 'vc_fanFacing' },
  { key: 'venue_tags', labelKey: 'vf_venueTags', descKey: 'vf_venueTagsDesc', categoryKey: 'vc_fanFacing' },
  // Tier 1 — Claimed (edit rights + identity)
  { key: 'edit_profile', labelKey: 'vf_editProfile', descKey: 'vf_editProfileDesc', categoryKey: 'vc_claimed' },
  { key: 'verified_badge', labelKey: 'vf_verifiedBadge', descKey: 'vf_verifiedBadgeDesc', categoryKey: 'vc_claimed' },
  { key: 'photos', labelKey: 'vf_photos', descKey: 'vf_photosDesc', categoryKey: 'vc_claimed' },
  { key: 'description', labelKey: 'vf_description', categoryKey: 'vc_claimed' },
  { key: 'inbox', labelKey: 'vf_inbox', descKey: 'vf_inboxDesc', categoryKey: 'vc_claimed' },
  // Tier 2 — Premium (operational tools)
  { key: 'schedule_manager', labelKey: 'vf_scheduleManager', descKey: 'vf_scheduleManagerDesc', categoryKey: 'vc_premium' },
  { key: 'backline', labelKey: 'vf_backline', descKey: 'vf_backlineDesc', categoryKey: 'vc_premium' },
  { key: 'analytics_basic', labelKey: 'vf_analyticsBasic', descKey: 'vf_analyticsBasicDesc', categoryKey: 'vc_premium' },
  { key: 'analytics_advanced', labelKey: 'vf_analyticsAdvanced', descKey: 'vf_analyticsAdvancedDesc', categoryKey: 'vc_premium' },
  { key: 'broadcasts', labelKey: 'vf_broadcasts', descKey: 'vf_broadcastsDesc', categoryKey: 'vc_premium' },
  { key: 'announcements', labelKey: 'vf_announcements', descKey: 'vf_announcementsDesc', categoryKey: 'vc_premium' },
  { key: 'merchandise', labelKey: 'vf_merchandise', descKey: 'vf_merchandiseDesc', categoryKey: 'vc_premium' },
  { key: 'priority_search', labelKey: 'vf_prioritySearch', descKey: 'vf_prioritySearchDesc', categoryKey: 'vc_premium' },
  { key: 'fan_insights', labelKey: 'vf_fanInsights', descKey: 'vf_fanInsightsDesc', categoryKey: 'vc_premium' },
  { key: 'post_show_recap', labelKey: 'vf_postShowRecap', descKey: 'vf_postShowRecapDesc', categoryKey: 'vc_premium' },
  { key: 'artist_recommendations', labelKey: 'vf_artistRecommendations', descKey: 'vf_artistRecommendationsDesc', categoryKey: 'vc_premium' },
  { key: 'weekly_digest', labelKey: 'vf_weeklyDigest', descKey: 'vf_weeklyDigestDesc', categoryKey: 'vc_premium' },
  { key: 'embed_calendar', labelKey: 'vf_embedCalendar', descKey: 'vf_embedCalendarDesc', categoryKey: 'vc_premium' },
  { key: 'custom_slug', labelKey: 'vf_customSlug', descKey: 'vf_customSlugDesc', categoryKey: 'vc_premium' },
  // Tier 3 — Elite (business engine + brand)
  { key: 'custom_domain', labelKey: 'vf_customDomain', descKey: 'vf_customDomainDesc', categoryKey: 'vc_elite' },
  { key: 'custom_theme', labelKey: 'vf_customTheme', descKey: 'vf_customThemeDesc', categoryKey: 'vc_elite' },
  { key: 'custom_og', labelKey: 'vf_customOg', descKey: 'vf_customOgDesc', categoryKey: 'vc_elite' },
  { key: 'seo_insights', labelKey: 'vf_seoInsights', descKey: 'vf_seoInsightsDesc', categoryKey: 'vc_elite' },
  { key: 'monthly_ai_summary', labelKey: 'vf_monthlyAiSummary', descKey: 'vf_monthlyAiSummaryDesc', categoryKey: 'vc_elite' },
  { key: 'calendar_feed', labelKey: 'vf_calendarFeed', descKey: 'vf_calendarFeedDesc', categoryKey: 'vc_premium' },
  { key: 'vip_support', labelKey: 'vf_vipSupport', descKey: 'vf_vipSupportDesc', categoryKey: 'vc_elite' },
  { key: 'ticketing', labelKey: 'vf_ticketing', descKey: 'vf_ticketingDesc', categoryKey: 'vc_elite' },
  { key: 'broadcasts_unlimited', labelKey: 'vf_broadcastsUnlimited', categoryKey: 'vc_elite' },
  { key: 'revenue_analytics', labelKey: 'vf_revenueAnalytics', descKey: 'vf_revenueAnalyticsDesc', categoryKey: 'vc_elite' },
  { key: 'multi_location', labelKey: 'vf_multiLocation', descKey: 'vf_multiLocationDesc', categoryKey: 'vc_elite' },
];

export default function VenueTiersPage() {
  return (
    <TierConfigTable
      entityType="venue"
      features={VENUE_FEATURES}
      notImplemented={NOT_IMPLEMENTED}
      titleKey="venueTiersTitle"
      descKey="venueTiersDesc"
    />
  );
}
