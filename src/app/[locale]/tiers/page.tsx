import { Fragment } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/utils/supabase/server';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
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

/* ─── Feature row type ─── */
interface Feature {
  name: string;
  tiers: (boolean | string)[];
}

/* ─── Reusable comparison table ─── */
function TierTable({
  columns,
  columnColors,
  features,
  highlight,
}: {
  columns: string[];
  columnColors: string[];
  features: { category: string; items: Feature[] }[];
  highlight: number; // which column to highlight (0-indexed)
}) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full min-w-[600px] border-collapse">
        {/* Header */}
        <thead>
          <tr>
            <th className="text-left py-4 px-4 text-sm text-[var(--muted)] font-normal w-[40%]" />
            {columns.map((col, i) => (
              <th
                key={col}
                className={`py-4 px-3 text-center text-sm font-semibold ${
                  i === highlight
                    ? 'text-gold bg-gold/5 rounded-t-xl'
                    : 'text-[var(--foreground)]'
                }`}
              >
                <span className={`inline-block px-3 py-1 rounded-full text-xs tracking-wider uppercase ${columnColors[i]}`}>
                  {col}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((group) => (
            <Fragment key={group.category}>
              {/* Category header */}
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="pt-6 pb-2 px-4 text-xs uppercase tracking-widest text-zinc-400 font-semibold border-b border-[var(--border)]"
                >
                  {group.category}
                </td>
              </tr>
              {group.items.map((feat, fi) => (
                <tr
                  key={feat.name}
                  className={`${fi % 2 === 0 ? 'bg-[var(--card)]/30' : ''} hover:bg-[var(--card)]/60 transition-colors`}
                >
                  <td className="py-3 px-4 text-sm text-[var(--foreground)]">{feat.name}</td>
                  {feat.tiers.map((val, ti) => (
                    <td
                      key={ti}
                      className={`py-3 px-3 text-center text-sm ${
                        ti === highlight ? 'bg-gold/5' : ''
                      }`}
                    >
                      {val === true ? (
                        <span className="text-emerald-400">&#10003;</span>
                      ) : val === false ? (
                        <span className="text-zinc-600">—</span>
                      ) : (
                        <span className="text-[var(--foreground)]">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Helper: convert minTier → display array ─── */
function tierRow(cfg: TierFeatures, key: string, numTiers: number): (boolean | string)[] {
  const min = cfg[key] ?? 0;
  return Array.from({ length: numTiers }, (_, i) => i >= min);
}

async function fetchTierConfig(): Promise<{ artist: TierFeatures; venue: TierFeatures }> {
  // Fallback defaults matching seed data
  // Philosophy: fan-facing (Tier 0) is always complete; tiers only gate creator backend tools
  const DEFAULT_ARTIST: TierFeatures = {
    public_profile: 0, search_listing: 0, event_association: 0,
    collaboration_graph: 0, follower_count_display: 0, tags_badges: 0, performance_history: 0,
    edit_profile: 1, verified_badge: 1, custom_bio: 1, social_links: 1,
    teaching_section: 1, gear_showcase: 1, epk_basic: 1, analytics_basic: 1,
    broadcasts: 2, featured_wall: 2, inbox: 2, available_for_hire: 2,
    analytics_advanced: 2, epk_full: 2, gear_unlimited: 2, priority_search: 2,
    custom_domain: 3, custom_theme: 3, broadcasts_unlimited: 3,
    booking_requests: 3, epk_branded_pdf: 3, spotlight: 3, data_export: 3,
  };
  const DEFAULT_VENUE: TierFeatures = {
    public_listing: 0, search_listing: 0, map_pin: 0, event_showcase: 0, venue_tags: 0,
    edit_profile: 1, verified_badge: 1, photos: 1, description: 1,
    schedule_manager: 2, backline: 2, analytics_basic: 2, analytics_advanced: 2,
    inbox: 2, artist_discovery: 2, broadcasts: 2, priority_search: 2,
    custom_domain: 3, custom_theme: 3, ticketing: 3, broadcasts_unlimited: 3,
    booking_management: 3, revenue_analytics: 3, multi_location: 3, ical_api: 3,
  };

  try {
    const supabase = await createClient();
    const { data } = await supabase.from('tier_config').select('entity_type, features');
    if (!data) return { artist: DEFAULT_ARTIST, venue: DEFAULT_VENUE };
    const artist = data.find((r) => r.entity_type === 'artist')?.features ?? DEFAULT_ARTIST;
    const venue = data.find((r) => r.entity_type === 'venue')?.features ?? DEFAULT_VENUE;
    return { artist, venue };
  } catch {
    return { artist: DEFAULT_ARTIST, venue: DEFAULT_VENUE };
  }
}

export default async function TiersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tiers' });
  const cfg = await fetchTierConfig();

  /* ─── Artist tiers data (dynamic from tier_config) ─── */
  const artistColumns = [t('free'), t('claimed'), t('premium'), t('elite')];
  const artistColors = [
    'bg-zinc-500/20 text-zinc-400',
    'bg-blue-500/20 text-blue-400',
    'bg-amber-500/20 text-amber-400',
    'bg-purple-500/20 text-purple-400',
  ];

  // Gear row: show text labels for tiers that unlock gear_showcase / gear_unlimited
  const gearRow: (boolean | string)[] = Array.from({ length: 4 }, (_, i) => {
    if (i >= (cfg.artist.gear_unlimited ?? 2)) return t('artistGearUnlimited');
    if (i >= (cfg.artist.gear_showcase ?? 1)) return t('artistGearLimit');
    return false;
  });

  // EPK row: show text labels for tiers that unlock epk_basic / epk_full / epk_branded_pdf
  const epkRow: (boolean | string)[] = Array.from({ length: 4 }, (_, i) => {
    if (i >= (cfg.artist.epk_branded_pdf ?? 3)) return t('artistEPKBranded');
    if (i >= (cfg.artist.epk_full ?? 2)) return t('artistEPKFull');
    if (i >= (cfg.artist.epk_basic ?? 1)) return t('artistEPKBasic');
    return false;
  });

  // Broadcasts row: show text labels for limited / unlimited
  const broadcastRow: (boolean | string)[] = Array.from({ length: 4 }, (_, i) => {
    if (i >= (cfg.artist.broadcasts_unlimited ?? 3)) return t('broadcastsUnlimited');
    if (i >= (cfg.artist.broadcasts ?? 2)) return t('broadcastsLimited');
    return false;
  });

  const artistFeatures = [
    {
      category: t('artistCatFanFacing'),
      items: [
        { name: t('artistPublicProfile'), tiers: tierRow(cfg.artist, 'public_profile', 4) },
        { name: t('artistSearchListing'), tiers: tierRow(cfg.artist, 'search_listing', 4) },
        { name: t('artistEventAssociation'), tiers: tierRow(cfg.artist, 'event_association', 4) },
        { name: t('artistCollaborationGraph'), tiers: tierRow(cfg.artist, 'collaboration_graph', 4) },
        { name: t('artistFollowerCount'), tiers: tierRow(cfg.artist, 'follower_count_display', 4) },
        { name: t('artistTagsBadges'), tiers: tierRow(cfg.artist, 'tags_badges', 4) },
        { name: t('artistPerformanceHistory'), tiers: tierRow(cfg.artist, 'performance_history', 4) },
      ],
    },
    {
      category: t('artistCatClaimed'),
      items: [
        { name: t('artistEditProfile'), tiers: tierRow(cfg.artist, 'edit_profile', 4) },
        { name: t('artistVerifiedBadge'), tiers: tierRow(cfg.artist, 'verified_badge', 4) },
        { name: t('artistCustomBio'), tiers: tierRow(cfg.artist, 'custom_bio', 4) },
        { name: t('artistSocialLinks'), tiers: tierRow(cfg.artist, 'social_links', 4) },
        { name: t('artistTeachingSection'), tiers: tierRow(cfg.artist, 'teaching_section', 4) },
        { name: t('artistGearShowcase'), tiers: gearRow },
        { name: t('artistEPK'), tiers: epkRow },
        { name: t('artistAnalyticsBasic'), tiers: tierRow(cfg.artist, 'analytics_basic', 4) },
      ],
    },
    {
      category: t('artistCatPremium'),
      items: [
        { name: t('artistBroadcasts'), tiers: broadcastRow },
        { name: t('artistFeaturedWall'), tiers: tierRow(cfg.artist, 'featured_wall', 4) },
        { name: t('artistInbox'), tiers: tierRow(cfg.artist, 'inbox', 4) },
        { name: t('artistAvailableForHire'), tiers: tierRow(cfg.artist, 'available_for_hire', 4) },
        { name: t('artistAnalyticsAdvanced'), tiers: tierRow(cfg.artist, 'analytics_advanced', 4) },
        { name: t('artistPrioritySearch'), tiers: tierRow(cfg.artist, 'priority_search', 4) },
      ],
    },
    {
      category: t('artistCatElite'),
      items: [
        { name: t('artistCustomDomain'), tiers: tierRow(cfg.artist, 'custom_domain', 4) },
        { name: t('artistCustomTheme'), tiers: tierRow(cfg.artist, 'custom_theme', 4) },
        { name: t('artistBookingRequests'), tiers: tierRow(cfg.artist, 'booking_requests', 4) },
        { name: t('artistSpotlight'), tiers: tierRow(cfg.artist, 'spotlight', 4) },
        { name: t('artistDataExport'), tiers: tierRow(cfg.artist, 'data_export', 4) },
      ],
    },
  ];

  /* ─── Venue tiers data (dynamic from tier_config) ─── */
  const venueColumns = [t('free'), t('claimed'), t('premium'), t('elite')];
  const venueColors = [
    'bg-zinc-500/20 text-zinc-400',
    'bg-blue-500/20 text-blue-400',
    'bg-amber-500/20 text-amber-400',
    'bg-purple-500/20 text-purple-400',
  ];

  // Venue broadcasts row: limited / unlimited
  const venueBroadcastRow: (boolean | string)[] = Array.from({ length: 4 }, (_, i) => {
    if (i >= (cfg.venue.broadcasts_unlimited ?? 3)) return t('broadcastsUnlimited');
    if (i >= (cfg.venue.broadcasts ?? 2)) return t('broadcastsLimited');
    return false;
  });

  const venueFeatures = [
    {
      category: t('venueCatFanFacing'),
      items: [
        { name: t('venuePublicListing'), tiers: tierRow(cfg.venue, 'public_listing', 4) },
        { name: t('venueSearchListing'), tiers: tierRow(cfg.venue, 'search_listing', 4) },
        { name: t('venueMapPin'), tiers: tierRow(cfg.venue, 'map_pin', 4) },
        { name: t('venueEventShowcase'), tiers: tierRow(cfg.venue, 'event_showcase', 4) },
        { name: t('venueVenueTags'), tiers: tierRow(cfg.venue, 'venue_tags', 4) },
      ],
    },
    {
      category: t('venueCatClaimed'),
      items: [
        { name: t('venueEditProfile'), tiers: tierRow(cfg.venue, 'edit_profile', 4) },
        { name: t('venueVerifiedBadge'), tiers: tierRow(cfg.venue, 'verified_badge', 4) },
        { name: t('venuePhotos'), tiers: tierRow(cfg.venue, 'photos', 4) },
        { name: t('venueDescription'), tiers: tierRow(cfg.venue, 'description', 4) },
      ],
    },
    {
      category: t('venueCatPremium'),
      items: [
        { name: t('venueScheduleManager'), tiers: tierRow(cfg.venue, 'schedule_manager', 4) },
        { name: t('venueBackline'), tiers: tierRow(cfg.venue, 'backline', 4) },
        { name: t('venueAnalyticsBasic'), tiers: tierRow(cfg.venue, 'analytics_basic', 4) },
        { name: t('venueAnalyticsAdvanced'), tiers: tierRow(cfg.venue, 'analytics_advanced', 4) },
        { name: t('venueInbox'), tiers: tierRow(cfg.venue, 'inbox', 4) },
        { name: t('venueArtistDiscovery'), tiers: tierRow(cfg.venue, 'artist_discovery', 4) },
        { name: t('venueBroadcasts'), tiers: venueBroadcastRow },
        { name: t('venuePrioritySearch'), tiers: tierRow(cfg.venue, 'priority_search', 4) },
      ],
    },
    {
      category: t('venueCatElite'),
      items: [
        { name: t('venueCustomDomain'), tiers: tierRow(cfg.venue, 'custom_domain', 4) },
        { name: t('venueCustomTheme'), tiers: tierRow(cfg.venue, 'custom_theme', 4) },
        { name: t('venueTicketing'), tiers: tierRow(cfg.venue, 'ticketing', 4) },
        { name: t('venueBookingManagement'), tiers: tierRow(cfg.venue, 'booking_management', 4) },
        { name: t('venueRevenueAnalytics'), tiers: tierRow(cfg.venue, 'revenue_analytics', 4) },
        { name: t('venueMultiLocation'), tiers: tierRow(cfg.venue, 'multi_location', 4) },
        { name: t('venueIcalApi'), tiers: tierRow(cfg.venue, 'ical_api', 4) },
      ],
    },
  ];

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
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 rounded-full bg-gold" />
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
              {t('artistSectionTitle')}
            </h2>
          </div>
          <p className="text-zinc-400 mb-8 max-w-2xl">
            {t('artistSectionDesc')}
          </p>

          {/* Tier summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {[
              { label: t('free'), sub: t('artistTier0Desc'), color: 'border-zinc-600 bg-zinc-800/50', tagColor: 'text-zinc-400', tag: 'Tier 0' },
              { label: t('claimed'), sub: t('artistTier1Desc'), color: 'border-blue-600 bg-blue-900/30', tagColor: 'text-blue-400', tag: 'Tier 1' },
              { label: t('premium'), sub: t('artistTier2Desc'), color: 'border-amber-500 bg-amber-900/25 ring-1 ring-amber-500/30', tagColor: 'text-amber-400', tag: 'Tier 2' },
              { label: t('elite'), sub: t('artistTier3Desc'), color: 'border-purple-600 bg-purple-900/25', tagColor: 'text-purple-400', tag: 'Tier 3' },
            ].map((c) => (
              <div key={c.tag} className={`rounded-xl border p-4 ${c.color} transition-colors`}>
                <div className={`text-xs mb-1 tracking-wider uppercase ${c.tagColor}`}>{c.tag}</div>
                <div className="font-semibold text-white text-lg">{c.label}</div>
                <div className="text-sm text-zinc-300 mt-1 leading-relaxed">{c.sub}</div>
              </div>
            ))}
          </div>

          <TierTable
            columns={artistColumns}
            columnColors={artistColors}
            features={artistFeatures}
            highlight={2}
          />
        </section>
      </FadeUpItem>

      {/* ─── Venue Tiers ─── */}
      <FadeUpItem delay={100}>
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 rounded-full bg-gold" />
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
              {t('venueSectionTitle')}
            </h2>
          </div>
          <p className="text-zinc-400 mb-8 max-w-2xl">
            {t('venueSectionDesc')}
          </p>

          {/* Tier summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {[
              { label: t('free'), sub: t('venueTier0Desc'), color: 'border-zinc-600 bg-zinc-800/50', tagColor: 'text-zinc-400', tag: 'Tier 0' },
              { label: t('claimed'), sub: t('venueTier1Desc'), color: 'border-blue-600 bg-blue-900/30', tagColor: 'text-blue-400', tag: 'Tier 1' },
              { label: t('premium'), sub: t('venueTier2Desc'), color: 'border-amber-500 bg-amber-900/25 ring-1 ring-amber-500/30', tagColor: 'text-amber-400', tag: 'Tier 2' },
              { label: t('elite'), sub: t('venueTier3Desc'), color: 'border-purple-600 bg-purple-900/25', tagColor: 'text-purple-400', tag: 'Tier 3' },
            ].map((c) => (
              <div key={c.tag} className={`rounded-xl border p-4 ${c.color} transition-colors`}>
                <div className={`text-xs mb-1 tracking-wider uppercase ${c.tagColor}`}>{c.tag}</div>
                <div className="font-semibold text-white text-lg">{c.label}</div>
                <div className="text-sm text-zinc-300 mt-1 leading-relaxed">{c.sub}</div>
              </div>
            ))}
          </div>

          <TierTable
            columns={venueColumns}
            columnColors={venueColors}
            features={venueFeatures}
            highlight={2}
          />
        </section>
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
