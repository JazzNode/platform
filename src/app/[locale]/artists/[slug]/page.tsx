export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getArtists, getEvents, getVenues, getBadges, getLineups, getCities, getTags, resolveLinks, buildMap, getArtistGear, getFollowerCount } from '@/lib/supabase';
import { displayName, artistDisplayName, artistDisplayNameField, formatDate, formatTime, photoUrl, localized, cityName, eventTitle, normalizeInstrumentKey, parseSpotifyEmbedUrl, parseYouTubeVideoId } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import ArtistPhotoUpload from '@/components/ArtistPhotoUpload';
import EditableSocialLinks from '@/components/EditableSocialLinks';
import EditableInstruments from '@/components/EditableInstruments';
import CollapsibleSection from '@/components/CollapsibleSection';
import FollowButton from '@/components/FollowButton';
import ClaimButton from '@/components/ClaimButton';
import UnclaimedNotice from '@/components/UnclaimedNotice';
import BadgeDock from '@/components/BadgeDock';
import HeroBadgeIcons from '@/components/HeroBadgeIcons';
import BadgeCategorySection from '@/components/BadgeCategorySection';
import type { BadgeProgress } from '@/lib/badges';
import MessageArtistButton from '@/components/MessageArtistButton';
import EditableContent from '@/components/EditableContent';
import EditableName from '@/components/EditableName';
import RecordNav from '@/components/RecordNav';
import PageViewTracker from '@/components/PageViewTracker';
import ShareButton from '@/components/ShareButton';
import ProfileCompleteness from '@/components/ProfileCompleteness';
import AdminEditedByBadge from '@/components/AdminEditedByBadge';
import TierGate from '@/components/TierGate';
import EpkDownloadButton from '@/components/EpkDownloadButton';
import VerifiedBadge from '@/components/VerifiedBadge';
import FeaturedWall from '@/components/FeaturedWall';
import CollaborationGraph from '@/components/CollaborationGraph';
import type { GraphNode, GraphLink } from '@/components/CollaborationGraph';
import ArtistShoutoutsSection from '@/components/ArtistShoutoutsSection';
import ArtistMagazineSection from '@/components/ArtistMagazineSection';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const artists = await getArtists().catch(() => []);
  const artist = artists.find((a) => a.id === slug);
  const name = artist ? artistDisplayName(artist.fields, locale) : 'Artist';
  const bio = artist ? (localized(artist.fields as Record<string, unknown>, 'bio', locale) || localized(artist.fields as Record<string, unknown>, 'bio_short', locale) || '') : '';
  const ogParams = new URLSearchParams({ name });
  if (artist?.fields.primary_instrument) ogParams.set('instrument', artist.fields.primary_instrument);
  if (artist?.fields.photo_url) ogParams.set('photo', artist.fields.photo_url);
  const bioSnippet = bio ? bio.slice(0, 120) : '';
  if (bioSnippet) ogParams.set('bio', bioSnippet);
  const defaultOgUrl = `/api/og/artist?${ogParams.toString()}`;
  // Elite artists can override OG image
  const ogUrl = (artist?.fields as Record<string, unknown>).brand_og_image_url as string || defaultOgUrl;
  const description = bio ? bio.slice(0, 160) : undefined;
  return {
    title: name,
    ...(description && { description }),
    openGraph: {
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      ...(description && { description }),
    },
    twitter: { card: 'summary_large_image' },
    alternates: {
      canonical: `/${locale}/artists/${slug}`,
      languages: {
        'x-default': `/en/artists/${slug}`,
        en: `/en/artists/${slug}`,
        'zh-Hant': `/zh/artists/${slug}`,
        ja: `/ja/artists/${slug}`,
        ko: `/ko/artists/${slug}`,
        th: `/th/artists/${slug}`,
        id: `/id/artists/${slug}`,
      },
    },
  };
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const t = await getTranslations('common');
  const tInst = await getTranslations('instruments');
  const instLabel = (key: string) => { const k = normalizeInstrumentKey(key); try { return tInst(k as never); } catch { return k; } };

  const [artists, events, venues, badges, lineups, cities, tags] = await Promise.all([
    getArtists(), getEvents(), getVenues(), getBadges(), getLineups(), getCities(), getTags().catch(() => []),
  ]);
  // Support vanity slug: check custom_slug first, then fall back to artist_id
  const artist = artists.find((a) => a.id === slug) || artists.find((a) => (a.fields as Record<string, unknown>).custom_slug === slug);

  if (!artist) {
    notFound();
  }

  // Extended fields (may not exist on Artist type yet — safe access)
  const fx = artist.fields as Record<string, unknown>;
  const customCtaUrl = fx.custom_cta_url as string | undefined;
  const customCtaLabel = fx.custom_cta_label as string | undefined;

  // Fetch gear and follower count for this artist
  const [artistGear, followerCount] = await Promise.all([
    getArtistGear(artist.id),
    getFollowerCount('artist', slug),
  ]);

  // Compute prev/next artist — alphabetical by displayName
  const allSorted = [...artists].sort((a, b) =>
    artistDisplayName(a.fields, locale).localeCompare(artistDisplayName(b.fields, locale))
  );
  const currentIdx = allSorted.findIndex((a) => a.id === artist.id);
  const prevArtist = currentIdx > 0 ? allSorted[currentIdx - 1] : null;
  const nextArtist = currentIdx >= 0 && currentIdx < allSorted.length - 1 ? allSorted[currentIdx + 1] : null;

  const f = artist.fields;
  const bioShort = localized(f as Record<string, unknown>, 'bio_short', locale);
  const bioFull = localized(f as Record<string, unknown>, 'bio', locale);
  const desc = localized(f as Record<string, unknown>, 'description', locale);

  // ── Events: split upcoming / past ──
  const allEvents = resolveLinks(f.event_list, events)
    .sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''));
  const now = new Date().toISOString();
  const upcomingEvents = allEvents
    .filter((e) => e.fields.lifecycle_status === 'upcoming' || (!e.fields.lifecycle_status && (e.fields.start_at || '') >= now))
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || '')); // soonest first
  const pastEvents = allEvents
    .filter((e) => e.fields.lifecycle_status === 'past' || (e.fields.lifecycle_status !== 'upcoming' && (e.fields.start_at || '') < now));

  // ── Lookup maps for event enrichment ──
  const artistMap = buildMap(artists);
  const tagMap = buildMap(tags);
  const lineupsByEvent = new Map<string, typeof lineups>();
  for (const l of lineups) {
    for (const eid of l.fields.event_id || []) {
      const arr = lineupsByEvent.get(eid);
      if (arr) arr.push(l);
      else lineupsByEvent.set(eid, [l]);
    }
  }

  // ── Badges: full progress for all artist badges ──
  const earnedBadgeIds = new Set(
    resolveLinks(f.badge_list, badges).map((b) => b.fields.badge_id),
  );
  const allArtistBadgeDefs = badges
    .filter((b) => b.fields.target_type === 'artist')
    .sort((a, b) => (a.fields.sort_order || 0) - (b.fields.sort_order || 0));

  // Compute stats for progress
  // eslint-disable-next-line react-hooks/purity -- server component; Date.now() is stable per request
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentEventCount = allEvents.filter(
    (e) => e.fields.start_at && new Date(e.fields.start_at) >= ninetyDaysAgo,
  ).length;

  const badgeCityLinks = resolveLinks(f.city_list, cities);
  const badgeCountryCount = new Set(
    badgeCityLinks.map((c) => (c.fields as Record<string, unknown>).country_code).filter(Boolean),
  ).size;

  const badgeLineups = lineups.filter((l) => l.fields.artist_id?.includes(artist.id));
  const bandleaderCount = badgeLineups.filter((l) => l.fields.role === 'bandleader').length;
  const badgeDistinctRoles = new Set(badgeLineups.map((l) => l.fields.role).filter(Boolean)).size;
  const instrumentCount = (f.instrument_list || []).length;

  const artistBadgeProgress: BadgeProgress[] = allArtistBadgeDefs.map((b) => {
    const bid = b.fields.badge_id || b.id;
    const target = b.fields.criteria_target as number | null;
    const isEarned = earnedBadgeIds.has(bid);

    let progress: { current: number; target: number } | null = null;
    switch (bid) {
      case 'art_gig_warrior':
        progress = { current: recentEventCount, target: target || 8 }; break;
      case 'art_globetrotter':
        progress = { current: badgeCountryCount, target: target || 3 }; break;
      case 'art_bandleader':
        progress = { current: bandleaderCount, target: target || 3 }; break;
      case 'art_versatile':
        progress = { current: badgeDistinctRoles, target: target || 3 }; break;
      case 'art_multi_instrumentalist':
        progress = { current: instrumentCount, target: target || 3 }; break;
    }

    const computedEarned = isEarned || (progress ? progress.current >= progress.target : false);
    return {
      badge_id: bid,
      category: (b.fields.category || 'recognition') as BadgeProgress['category'],
      name: localized(b.fields as Record<string, unknown>, 'name', locale) || b.fields.name_en || '',
      description: localized(b.fields as Record<string, unknown>, 'description', locale) || b.fields.description_en || '',
      earned: computedEarned,
      earned_at: f.badge_earned_at?.[bid] ?? (computedEarned ? new Date().toISOString() : null),
      progress,
      sort_order: b.fields.sort_order || 0,
    } as BadgeProgress;
  });

  // Legacy badgeItems for BadgeDock (kept for backward compat if needed elsewhere)
  const badgeItems = resolveLinks(f.badge_list, badges).map((b) => ({
    id: b.id,
    badgeId: b.fields.badge_id,
    name: localized(b.fields as Record<string, unknown>, 'name', locale) || b.fields.name_en || '',
    description: localized(b.fields as Record<string, unknown>, 'description', locale) || b.fields.description_en || '',
  }));

  // ── Versatility: bandleader / sideman / featured_guest / band_member ──
  const leaderProjects = resolveLinks(f.as_bandleader_list, artists);
  const sidemanProjects = resolveLinks(f.as_sideman_list, artists).filter(
    (a) => a.fields.type === 'group' || a.fields.type === 'big band',
  );
  const featuredGuestProjects = resolveLinks(f.as_featured_guest_list, artists);
  const bandMemberProjects = resolveLinks(f.as_band_member_list, artists);
  const hasVersatility = leaderProjects.length > 0 || sidemanProjects.length > 0 || featuredGuestProjects.length > 0 || bandMemberProjects.length > 0;

  // ── Frequent Collaborators ──
  const artistLineups = resolveLinks(f.lineup_list, lineups);
  const artistEventIds = new Set(artistLineups.flatMap((l) => l.fields.event_id || []));
  const coAppearances = new Map<string, number>();
  for (const lineup of lineups) {
    const eventIds = lineup.fields.event_id || [];
    const artistIds = lineup.fields.artist_id || [];
    if (!eventIds.some((eid) => artistEventIds.has(eid))) continue;
    for (const aid of artistIds) {
      if (aid === artist.id) continue;
      coAppearances.set(aid, (coAppearances.get(aid) || 0) + 1);
    }
  }
  const GRAPH_MAX = 30;
  const allCollaboratorsSorted = [...coAppearances.entries()]
    .sort((a, b) => b[1] - a[1]);
  const topCollaborators = allCollaboratorsSorted
    .slice(0, 5)
    .map(([id, count]) => {
      const a = artists.find((x) => x.id === id);
      return a ? { id, count, fields: a.fields } : null;
    })
    .filter(Boolean) as { id: string; count: number; fields: typeof f }[];

  // ── Collaboration Graph data (top N collaborators + cross-connections) ──
  const graphCollaborators = allCollaboratorsSorted
    .slice(0, GRAPH_MAX)
    .map(([id, count]) => {
      const a = artists.find((x) => x.id === id);
      return a ? { id, count, fields: a.fields } : null;
    })
    .filter(Boolean) as { id: string; count: number; fields: typeof f }[];

  const graphNodeIds = new Set([artist.id, ...graphCollaborators.map((c) => c.id)]);

  // Build cross-connections: for each event, find pairs of graph-node artists
  const graphLinks: { source: string; target: string; weight: number }[] = [];
  const linkWeightMap = new Map<string, number>();
  // Center → collaborator links
  for (const c of graphCollaborators) {
    const key = [artist.id, c.id].sort().join('|');
    linkWeightMap.set(key, c.count);
  }
  // Cross-connections between collaborators (from shared events)
  const eventLineups = new Map<string, string[]>();
  for (const lineup of lineups) {
    for (const eid of lineup.fields.event_id || []) {
      for (const aid of lineup.fields.artist_id || []) {
        if (!graphNodeIds.has(aid)) continue;
        const arr = eventLineups.get(eid);
        if (arr) { if (!arr.includes(aid)) arr.push(aid); }
        else eventLineups.set(eid, [aid]);
      }
    }
  }
  for (const artistIds of eventLineups.values()) {
    for (let i = 0; i < artistIds.length; i++) {
      for (let j = i + 1; j < artistIds.length; j++) {
        const key = [artistIds[i], artistIds[j]].sort().join('|');
        if (!linkWeightMap.has(key)) linkWeightMap.set(key, 0);
        linkWeightMap.set(key, linkWeightMap.get(key)! + 1);
      }
    }
  }
  for (const [key, weight] of linkWeightMap) {
    const [src, tgt] = key.split('|');
    graphLinks.push({ source: src, target: tgt, weight });
  }

  // Compute primary role for each graph collaborator (most frequent role in shared lineups)
  const graphCollabRoles = new Map<string, string>();
  for (const lineup of lineups) {
    const eids = lineup.fields.event_id || [];
    const aids = lineup.fields.artist_id || [];
    if (!eids.some((eid) => artistEventIds.has(eid))) continue;
    for (const aid of aids) {
      if (aid === artist.id || !graphNodeIds.has(aid)) continue;
      if (!graphCollabRoles.has(aid) && lineup.fields.role) {
        graphCollabRoles.set(aid, lineup.fields.role);
      }
    }
  }

  // ── Active Hubs: venues & cities ──
  const artistVenues = resolveLinks(f.venue_list, venues);
  const artistCities = resolveLinks(f.city_list, cities);
  // Count gigs per venue
  const venueGigCounts = new Map<string, number>();
  for (const event of allEvents) {
    for (const vid of event.fields.venue_id || []) {
      venueGigCounts.set(vid, (venueGigCounts.get(vid) || 0) + 1);
    }
  }
  const venuesWithCounts = artistVenues
    .map((v) => ({ ...v, gigCount: venueGigCounts.get(v.id) || 0 }))
    .sort((a, b) => b.gigCount - a.gigCount);
  // Globetrotter check: 3+ distinct countries
  const distinctCountries = new Set(artistCities.map((c) => c.fields.country_code).filter(Boolean));
  const isGlobetrotter = distinctCountries.size >= 3;

  // ── Group/Big Band Members (reverse lookup via lineups) ──
  const isGroupType = f.type === 'group' || f.type === 'big band';
  const groupMembers: { id: string; fields: typeof f; role: string; instruments: string[] }[] = [];
  if (isGroupType) {
    type MemberAgg = Map<string, { roles: Map<string, number>; instruments: Set<string>; count: number }>;
    const memberAgg: MemberAgg = new Map();

    const addToAgg = (aid: string, role: string | undefined, instruments: string[]) => {
      if (aid === artist.id) return;
      const existing = memberAgg.get(aid) || { roles: new Map(), instruments: new Set(), count: 0 };
      if (role) existing.roles.set(role, (existing.roles.get(role) || 0) + 1);
      for (const inst of instruments) existing.instruments.add(inst);
      existing.count++;
      memberAgg.set(aid, existing);
    };

    // Strategy 1: collect event IDs from both event_list and lineup_list
    const groupEventIds = new Set(f.event_list || []);
    const groupLineups = resolveLinks(f.lineup_list, lineups);
    for (const gl of groupLineups) {
      for (const eid of gl.fields.event_id || []) groupEventIds.add(eid);
    }

    // Find all lineups for the group's events
    if (groupEventIds.size > 0) {
      for (const lineup of lineups) {
        const lEventIds = lineup.fields.event_id || [];
        if (!lEventIds.some((eid) => groupEventIds.has(eid))) continue;
        for (const aid of lineup.fields.artist_id || []) {
          addToAgg(aid, lineup.fields.role, lineup.fields.instrument_list || []);
        }
      }
    }

    // Strategy 2 (fallback): find person artists whose as_*_list contains this group's ID
    if (memberAgg.size === 0) {
      for (const a of artists) {
        if (a.id === artist.id || a.fields.type !== 'person') continue;
        const roles: string[] = [];
        if (a.fields.as_bandleader_list?.includes(artist.id)) roles.push('bandleader');
        if (a.fields.as_sideman_list?.includes(artist.id)) roles.push('sideman');
        if (a.fields.as_band_member_list?.includes(artist.id)) roles.push('band_member');
        if (a.fields.as_featured_guest_list?.includes(artist.id)) roles.push('featured_guest');
        if (roles.length > 0) {
          for (const r of roles) addToAgg(a.id, r, a.fields.primary_instrument ? [a.fields.primary_instrument] : []);
        }
      }
    }

    // Resolve to artist records; pick the most frequent role per member
    for (const [id, data] of memberAgg) {
      const a = artists.find((x) => x.id === id);
      if (!a || a.fields.type !== 'person') continue;
      const topRole = [...data.roles.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      groupMembers.push({ id, fields: a.fields, role: topRole, instruments: [...data.instruments] });
    }
    // Sort: bandleader first, then is_master, then alphabetical
    groupMembers.sort((a, b) => {
      if (a.role === 'bandleader' !== (b.role === 'bandleader')) return a.role === 'bandleader' ? -1 : 1;
      if (!!a.fields.is_master !== !!b.fields.is_master) return a.fields.is_master ? -1 : 1;
      const nameA = a.fields.name_en || a.fields.name_local || '';
      const nameB = b.fields.name_en || b.fields.name_local || '';
      return nameA.localeCompare(nameB, 'zh-Hant');
    });
  }

  const hasNetwork = hasVersatility || topCollaborators.length > 0;
  const hasHubs = artistVenues.length > 0 || artistCities.length > 0;

  // ── Similar Artists ──
  const similarArtists = artists
    .filter((a) => {
      if (a.id === artist.id) return false;
      if (a.fields.type !== 'person' && f.type === 'person') return false;
      return a.fields.primary_instrument === f.primary_instrument || a.fields.country_code === f.country_code;
    })
    .sort((a, b) => {
      // Prioritize same instrument + same country
      const aScore = (a.fields.primary_instrument === f.primary_instrument ? 2 : 0) + (a.fields.country_code === f.country_code ? 1 : 0);
      const bScore = (b.fields.primary_instrument === f.primary_instrument ? 2 : 0) + (b.fields.country_code === f.country_code ? 1 : 0);
      return bScore - aScore;
    })
    .slice(0, 8);

  // ─── JSON-LD structured data (schema.org) ───
  const localeToInLanguage: Record<string, string> = {
    en: 'en', zh: 'zh-Hant', ja: 'ja', ko: 'ko', th: 'th', id: 'id',
  };
  const sameAs = [
    f.website_url, f.spotify_url, f.youtube_url, f.facebook_url,
    f.instagram ? `https://www.instagram.com/${f.instagram.replace(/^@/, '')}` : undefined,
  ].filter(Boolean) as string[];
  const artistBio = bioFull || bioShort || desc;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': f.type === 'group' || f.type === 'big band' ? 'MusicGroup' : 'Person',
    name: artistDisplayName(f, locale),
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com'}/${locale}/artists/${slug}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com'}/${locale}/artists/${slug}`,
    },
    ...(artistBio && { description: artistBio }),
    ...(photoUrl(f.photo_url) && { image: photoUrl(f.photo_url) }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(localeToInLanguage[locale] && { inLanguage: localeToInLanguage[locale] }),
    ...(f.primary_instrument && { knowsAbout: f.primary_instrument }),
    ...(isGroupType && groupMembers.length > 0 && {
      member: groupMembers.map((m) => ({
        '@type': 'Person',
        name: artistDisplayName(m.fields, locale),
      })),
    }),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'JazzNode', item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com'}/${locale}` },
      { '@type': 'ListItem', position: 2, name: t('artists'), item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com'}/${locale}/artists` },
      { '@type': 'ListItem', position: 3, name: artistDisplayName(f, locale) },
    ],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Link href={`/${locale}/artists`} className="mb-8 inline-block text-sm text-[var(--muted-foreground)] hover:text-gold transition-colors link-lift">
        {t('backToList')}
      </Link>

      <div className="space-y-12">
      {/* ═══ Hero Cover + Profile ═══ */}
      <FadeUp>
        {/* Cover gradient */}
        <div className="relative h-48 md:h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1510] via-[#12110e] to-[var(--background)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(200,168,78,0.06),transparent_60%)]" />
        </div>

        {/* Profile row */}
        <div className="-mt-16 px-2 sm:px-6 relative z-10">
          <div className="flex flex-col md:flex-row gap-5 md:gap-8 items-start">
            {/* Photo */}
            <div>
              <ArtistPhotoUpload
                artistId={artist.id}
                artistName={artistDisplayName(f, locale)}
                currentPhotoUrl={photoUrl(f.photo_url)}
                size="md"
              />
            </div>

            {/* Identity */}
            <div className="flex-1 space-y-3 pt-1 md:pt-8 min-w-0">
              {/* Name */}
              <div>
                <div className="inline-flex items-start gap-1">
                  <EditableName
                    entityType="artist"
                    entityId={artist.id}
                    field={artistDisplayNameField(f, locale)}
                    value={artistDisplayName(f, locale)}
                    fieldOptions={[
                      { field: 'name_local', label: 'name_local', value: f.name_local || '' },
                      { field: 'name_en', label: 'name_en', value: f.name_en || '' },
                      { field: 'display_name', label: 'display_name', value: f.display_name || '' },
                    ]}
                    className="font-serif text-4xl sm:text-5xl font-bold"
                    tag="h1"
                  />
                  {f.tier != null && f.tier >= 1 && <VerifiedBadge label={t('claimed')} className={`!top-0 !ml-0 ${/[a-z]$/.test(artistDisplayName(f, locale)) ? 'mt-1 sm:mt-1.5' : 'mt-0'}`} />}
                </div>
                {f.name_en && f.name_local && f.name_en !== f.name_local && (
                  <EditableName
                    entityType="artist"
                    entityId={artist.id}
                    field="name_en"
                    value={f.name_en}
                    fieldOptions={[
                      { field: 'name_local', label: 'name_local', value: f.name_local || '' },
                      { field: 'name_en', label: 'name_en', value: f.name_en || '' },
                      { field: 'display_name', label: 'display_name', value: f.display_name || '' },
                    ]}
                    className="mt-1 text-xl text-[var(--muted-foreground)]"
                    tag="p"
                  />
                )}
              </div>

              {/* Headline: instrument · type · country */}
              <p className="text-sm text-[var(--muted-foreground)] flex flex-wrap items-center gap-1">
                {f.primary_instrument && (
                  <>
                    <EditableInstruments
                      entityId={artist.id}
                      primaryInstrument={f.primary_instrument}
                      instrumentList={f.instrument_list}
                      primaryInstrumentLabel={f.primary_instrument ? instLabel(f.primary_instrument) : undefined}
                    />
                  </>
                )}
                {f.type && (
                  <>
                    <span className="text-[var(--muted-foreground)]/30">·</span>
                    <span className="text-xs uppercase tracking-widest">
                      {f.type === 'person' ? t('musicians') : f.type === 'big band' ? t('bigBands') : t('groups')}
                    </span>
                  </>
                )}
                {f.country_code && (
                  <>
                    <span className="text-[var(--muted-foreground)]/30">·</span>
                    <span className="text-xs uppercase tracking-widest">{f.country_code}</span>
                  </>
                )}
                {f.is_master && (
                  <>
                    <span className="text-[var(--muted-foreground)]/30">·</span>
                    <span className="text-xs uppercase tracking-widest text-gold font-bold">Master</span>
                  </>
                )}
              </p>

              {/* Badge icons + Status badges — client component for SVG rendering */}
              <HeroBadgeIcons
                badges={artistBadgeProgress.filter((b) => b.earned).map((b) => ({ badge_id: b.badge_id, name: b.name }))}
                availableForHire={!!f.available_for_hire}
                acceptingStudents={!!f.accepting_students}
                hireLabel={t('availableForHire')}
                studentsLabel={t('acceptingStudentsLabel')}
              />
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex gap-6 sm:gap-10 mt-5 px-1">
            <div>
              <div className="text-lg font-bold">{followerCount}</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{t('followers')}</div>
            </div>
            <div>
              <div className="text-lg font-bold">{allEvents.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{t('performances')}</div>
            </div>
            {coAppearances.size > 0 && (
              <div>
                <div className="text-lg font-bold">{coAppearances.size}</div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{t('collaborators')}</div>
              </div>
            )}
            {(() => {
              const oldestEvent = allEvents[allEvents.length - 1];
              if (!oldestEvent?.fields.start_at) return null;
              const years = new Date().getFullYear() - new Date(oldestEvent.fields.start_at).getFullYear();
              if (years < 1) return null;
              return (
                <div>
                  <div className="text-lg font-bold">{years}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{t('yearsActive')}</div>
                </div>
              );
            })()}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4 px-1">
            <FollowButton itemType="artist" itemId={artist.id} variant="full" followerCount={followerCount} />
            <TierGate entityType="artist" featureKey="inbox" currentTier={f.tier ?? 0}
              fallback={<MessageArtistButton artistId={artist.id} claimed={false} availableForHire={!!f.available_for_hire} acceptingStudents={!!f.accepting_students} artistName={artistDisplayName(f, locale)} />}>
              <MessageArtistButton artistId={artist.id} claimed={!!f.tier && f.tier >= 1} availableForHire={!!f.available_for_hire} acceptingStudents={!!f.accepting_students} artistName={artistDisplayName(f, locale)} />
            </TierGate>
            <ClaimButton targetType="artist" targetId={artist.id} targetName={artistDisplayName(f, locale)} />
            <ShareButton
              title={artistDisplayName(f, locale)}
              url={`/${locale}/artists/${slug}`}
              text={[
                `${artistDisplayName(f, locale)}${f.primary_instrument ? ` — ${instLabel(f.primary_instrument)}` : ''}`,
                localized(f as Record<string, unknown>, 'bio', locale)?.slice(0, 100) || localized(f as Record<string, unknown>, 'bio_short', locale)?.slice(0, 100) || '',
                'via JazzNode — The Jazz Scene, Connected.',
              ].filter(Boolean).join('\n')}
              variant="compact"
              label={t('share')}
            />
            {/* EPK Download — public, with optional contact form for guests */}
            <TierGate entityType="artist" featureKey="epk_basic" currentTier={f.tier ?? 0}>
              <EpkDownloadButton artistId={artist.id} />
            </TierGate>
            {/* Custom CTA — Elite only */}
            {customCtaUrl && customCtaLabel && (f.tier ?? 0) >= 3 && (
              <a
                href={customCtaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--color-gold)]/40 text-[var(--color-gold)] text-xs font-semibold uppercase tracking-widest hover:bg-[var(--color-gold)]/10 transition-colors"
              >
                🔗 {customCtaLabel}
              </a>
            )}
            {/* Calendar Subscribe — Elite only */}
            {(f.tier ?? 0) >= 3 && (
              <a
                href={`/api/artist/${artist.id}/calendar.ics`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--color-gold)]/30 transition-colors"
                title={t('subscribeCalendar')}
              >
                📅 {t('subscribeCalendar')}
              </a>
            )}
          </div>

          {/* Data source notice */}
          <div className="mt-3 px-1">
            {f.data_source === 'user' ? (
              <p className="text-xs text-gold/70 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                {t('dataSourceArtistManaged')}
              </p>
            ) : (!f.tier || f.tier === 0) && f.verification_status !== 'Verified' ? (
              <UnclaimedNotice targetType="artist" targetId={artist.id} targetName={artistDisplayName(f, locale)} />
            ) : null}
            {f.data_source === 'admin' && f.updated_by && (
              <AdminEditedByBadge updatedBy={f.updated_by} />
            )}
          </div>

          {/* Profile completeness (owner only) */}
          <ProfileCompleteness
            artistId={artist.id}
            hasPhoto={!!photoUrl(f.photo_url)}
            hasBio={!!(bioFull || bioShort)}
            hasSocialLinks={!!(f.website_url || f.spotify_url || f.youtube_url || f.instagram || f.facebook_url)}
            hasInstruments={!!(f.primary_instrument || (f.instrument_list && f.instrument_list.length > 0))}
            hasTeaching={!!f.accepting_students}
            hasGear={artistGear.length > 0}
          />
        </div>
      </FadeUp>

      {/* ═══ About ═══ */}
      <FadeUp>
        <section className="border-t border-[var(--border)] pt-10">
          <h2 className="font-serif text-2xl font-bold mb-5">{t('aboutSection')}</h2>

          {/* Bio with see more */}
          <EditableContent
            entityType="artist"
            entityId={artist.id}
            fieldPrefix="bio"
            locale={locale}
            content={bioFull}
            shortContent={bioShort}
            contentClassName="text-[#C4BFB3] leading-relaxed whitespace-pre-line"
            shortContentClassName="text-[var(--foreground)] font-medium text-lg leading-relaxed"
          />
          {!bioFull && desc && (
            <p className="text-[#C4BFB3] leading-relaxed mt-3">{desc}</p>
          )}

          {/* Quick Facts */}
          {((f.instrument_list?.length ?? 0) > 0 || f.country_code) && (
            <div className="flex flex-wrap gap-2 mt-5">
              {(f.instrument_list || []).map((inst: string) => (
                <span key={inst} className="text-xs px-3 py-1.5 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)]">
                  {instLabel(inst)}
                </span>
              ))}
              {f.country_code && (
                <span className="text-xs px-3 py-1.5 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)]">
                  {f.country_code}
                </span>
              )}
            </div>
          )}

          {/* Social links */}
          <TierGate entityType="artist" featureKey="social_links" currentTier={f.tier ?? 0}>
            <div className="mt-5">
              <EditableSocialLinks
                entityType="artist"
                entityId={artist.id}
                artistName={artistDisplayName(f, locale)}
                claimed={!!f.tier && f.tier >= 1}
                fields={{
                  website_url: f.website_url,
                  spotify_url: f.spotify_url,
                  youtube_url: f.youtube_url,
                  instagram: f.instagram,
                  facebook_url: f.facebook_url,
                }}
              />
            </div>
          </TierGate>
        </section>
      </FadeUp>

      {/* ═══ Media Showcase: Spotify + YouTube ═══ */}
      {(f.spotify_url || f.youtube_url) && (() => {
        const spotifyEmbed = f.spotify_url ? parseSpotifyEmbedUrl(f.spotify_url) : null;
        const youtubeVideoId = f.youtube_url ? parseYouTubeVideoId(f.youtube_url) : null;
        const hasSpotify = !!spotifyEmbed;
        const hasYouTube = !!f.youtube_url;
        if (!hasSpotify && !hasYouTube) return null;

        return (
          <FadeUp>
            <section className="border-t border-[var(--border)] pt-12">
              <div className={`grid gap-6 ${hasSpotify && hasYouTube ? 'md:grid-cols-2' : ''}`}>
                {/* Spotify: 藝人作品 */}
                {hasSpotify && (
                  <div>
                    <h2 className="font-serif text-2xl font-bold mb-5 flex items-center gap-3">
                      <svg className="w-5 h-5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      {t('artistWorks')}
                    </h2>
                    <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--card)]">
                      <iframe
                        src={spotifyEmbed}
                        width="100%"
                        height="352"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="block"
                        title={`${artistDisplayName(f, locale)} on Spotify`}
                      />
                    </div>
                  </div>
                )}

                {/* YouTube: 藝人頻道 */}
                {hasYouTube && (
                  <div>
                    <h2 className="font-serif text-2xl font-bold mb-5 flex items-center gap-3">
                      <svg className="w-5 h-5 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                        <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff"/>
                      </svg>
                      {t('artistChannel')}
                    </h2>
                    {youtubeVideoId ? (
                      <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--card)]">
                        <div className="aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1`}
                            width="100%"
                            height="100%"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                            className="block"
                            title={`${artistDisplayName(f, locale)} on YouTube`}
                          />
                        </div>
                      </div>
                    ) : (
                      <a
                        href={f.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 hover:border-[#FF0000]/30 transition-all duration-300 card-hover"
                      >
                        <div className="flex flex-col items-center text-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-[#FF0000]/10 flex items-center justify-center group-hover:bg-[#FF0000]/20 transition-colors duration-300">
                            <svg className="w-8 h-8 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                              <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-serif text-lg font-bold text-[var(--foreground)] group-hover:text-[#FF0000] transition-colors duration-300">
                              {artistDisplayName(f, locale)}
                            </p>
                            <p className="text-sm text-[var(--muted-foreground)] mt-1">YouTube</p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#FF0000]/70 group-hover:text-[#FF0000] transition-colors">
                            {t('visitChannel')} ↗
                          </span>
                        </div>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>
          </FadeUp>
        );
      })()}

      {/* ═══ Featured Performance Wall (Premium) ═══ */}
      <TierGate entityType="artist" featureKey="featured_wall" currentTier={f.tier ?? 0}>
        <FeaturedWall artistId={artist.id} />
      </TierGate>

      {/* Members section removed — info is in the collaboration graph */}

      {/* ═══ Upcoming Gigs ═══ */}
      {upcomingEvents.length > 0 && (
        <FadeUp>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
              <span className="pulse-dot" />
              {t('upcomingGigs')}
            </h2>
            <div className="space-y-3">
              {upcomingEvents.slice(0, 6).map((event, i) => {
                const tz = event.fields.timezone || 'Asia/Taipei';
                const venue = resolveLinks(event.fields.venue_id, venues)[0];
                const eventLineups = (lineupsByEvent.get(event.id) || [])
                  .sort((a, b) => (a.fields.order || 99) - (b.fields.order || 99));
                const sidemen = eventLineups
                  .map((l) => resolveLinks(l.fields.artist_id, artistMap)[0])
                  .filter(Boolean)
                  .filter((a) => a.id !== artist.id)
                  .map((a) => artistDisplayName(a.fields, locale));
                const startDate = event.fields.start_at ? new Date(event.fields.start_at) : null;
                const month = startDate ? startDate.toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale, { month: 'short', timeZone: tz }) : '';
                const dayParts = startDate ? new Intl.DateTimeFormat(locale === 'zh' ? 'zh-TW' : locale, { day: 'numeric', timeZone: tz }).formatToParts(startDate) : [];
                const day = dayParts.find(p => p.type === 'day')?.value || '';
                const dow = startDate ? startDate.toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale, { weekday: 'short', timeZone: tz }) : '';

                return (
                  <FadeUpItem key={event.id} delay={(i % 6) * 40}>
                    <Link
                      href={`/${locale}/events/${event.id}`}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--border)] hover:border-gold/20 transition-colors group"
                    >
                      {/* Date block */}
                      <div className="text-center shrink-0 w-14">
                        <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">{month}</div>
                        <div className="text-2xl font-bold font-serif leading-tight">{day}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">{dow}</div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-bold group-hover:text-gold transition-colors duration-300 truncate">
                          {eventTitle(event.fields, locale)}
                        </h3>
                        {venue && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{displayName(venue.fields)}</p>
                        )}
                        {sidemen.length > 0 && (
                          <p className="text-xs text-[var(--muted-foreground)]/60 mt-0.5">w/ {sidemen.join(', ')}</p>
                        )}
                      </div>
                      {/* Ticket */}
                      {event.fields.source_url && (
                        <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-gold px-3 py-1.5 rounded-full border border-gold/20 group-hover:border-gold/40 transition-colors">
                          {t('tickets')} ↗
                        </span>
                      )}
                    </Link>
                  </FadeUpItem>
                );
              })}
            </div>
          </section>
        </FadeUp>
      )}

      {/* ═══ Past Highlights ═══ */}
      {pastEvents.length > 0 && (
        <FadeUp>
          <section className={upcomingEvents.length === 0 ? 'border-t border-[var(--border)] pt-12' : ''}>
            {upcomingEvents.length === 0 && (
              <p className="text-[var(--muted-foreground)] text-sm mb-6">{t('noEvents')}</p>
            )}
            <CollapsibleSection
              title={t('pastHighlights')}
              count={pastEvents.length}
              countLabel={t('gigsCount')}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pastEvents.slice(0, 12).map((event) => {
                  const tz = event.fields.timezone || 'Asia/Taipei';
                  const venue = resolveLinks(event.fields.venue_id, venues)[0];
                  return (
                    <Link
                      key={event.id}
                      href={`/${locale}/events/${event.id}`}
                      className="block p-4 rounded-xl border border-[var(--border)] hover:border-[var(--color-gold)]/20 transition-colors group"
                    >
                      <div className="text-xs text-[var(--muted-foreground)] mb-1">
                        {formatDate(event.fields.start_at, locale, tz)}
                      </div>
                      <h3 className="text-sm font-medium group-hover:text-gold transition-colors duration-300 line-clamp-1">
                        {eventTitle(event.fields, locale)}
                      </h3>
                      {venue && <p className="text-xs text-[var(--muted-foreground)]/60 mt-0.5">{displayName(venue.fields)}</p>}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleSection>
          </section>
        </FadeUp>
      )}

      {/* ═══ Jazz Network (graph 2:1 collaborators on desktop, stacked on mobile) ═══ */}
      {(graphCollaborators.length >= 3 || topCollaborators.length > 0) && (
        <FadeUp>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8">{t('jazzNetwork')}</h2>

            {/* Filter bar is inside CollaborationGraph; we split layout so cards align to SVG top */}
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Left: Collaboration Graph — fills remaining space */}
              {graphCollaborators.length >= 3 && (
                <div className="flex-1 min-w-0">
                  <CollaborationGraph
                    centerArtist={{
                      id: artist.id,
                      name: artistDisplayName(f, locale),
                      instrument: f.primary_instrument || null,
                      instrumentLabel: f.primary_instrument ? instLabel(f.primary_instrument) : null,
                      artistType: f.type || null,
                      photoUrl: photoUrl(f.photo_url) || null,
                      gigCount: allEvents.length,
                      isCenter: true,
                    }}
                    collaborators={[
                      ...graphCollaborators.map((c) => ({
                        id: c.id,
                        name: artistDisplayName(c.fields, locale),
                        instrument: c.fields.primary_instrument || null,
                        instrumentLabel: c.fields.primary_instrument ? instLabel(c.fields.primary_instrument) : null,
                        artistType: c.fields.type || null,
                        photoUrl: photoUrl(c.fields.photo_url) || null,
                        gigCount: c.count,
                      })),
                      ...venuesWithCounts.slice(0, 6).map((v) => ({
                        id: `venue-${v.id}`,
                        name: displayName(v.fields),
                        instrument: null,
                        instrumentLabel: null,
                        artistType: null,
                        photoUrl: null,
                        gigCount: v.gigCount,
                        nodeType: 'venue' as const,
                      })),
                    ]}
                    links={[
                      ...graphLinks,
                      ...venuesWithCounts.slice(0, 6).map((v) => ({
                        source: artist.id,
                        target: `venue-${v.id}`,
                        weight: v.gigCount,
                      })),
                    ]}
                    locale={locale}
                    labels={{
                      gigs: t('gigsCount'),
                      collaborators: t('collaborationGigsCount'),
                      dragHint: t('collaborationGraphHint'),
                      filterInstrument: t('filterInstrument'),
                      filterType: t('filterType'),
                      filterMinGigs: t('filterMinGigs'),
                      filterAll: t('filterClearAll'),
                      typePerson: t('filterTypePerson'),
                      typeGroup: t('filterTypeGroup'),
                      typeVenue: t('venues'),
                    }}
                  />
                </div>
              )}

              {/* Right: Frequent Collaborators — card style, aligned to graph SVG top */}
              {topCollaborators.length > 0 && (
                <div className="lg:w-80 lg:shrink-0 lg:pt-10 space-y-2">
                  {topCollaborators.map((collab) => (
                    <Link
                      key={collab.id}
                      href={`/${locale}/artists/${collab.id}`}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-gold/20 transition-colors group"
                    >
                      {photoUrl(collab.fields.photo_url) ? (
                        <Image
                          src={photoUrl(collab.fields.photo_url)!}
                          alt={artistDisplayName(collab.fields, locale)}
                          width={40} height={40}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--border)]"
                          sizes="40px"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--border)] flex items-center justify-center text-sm shrink-0">
                          ♪
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold group-hover:text-gold transition-colors truncate block">
                          {artistDisplayName(collab.fields, locale)}
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {collab.fields.primary_instrument ? instLabel(collab.fields.primary_instrument) : ''}
                        </span>
                      </div>
                      <span className="text-xs text-gold shrink-0">
                        {collab.count} {t('gigsCount')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </FadeUp>
      )}

      {/* Active Hubs removed — venues are now in the collaboration graph */}

      {/* ═══ Teaching Section ═══ */}
      <TierGate entityType="artist" featureKey="teaching_section" currentTier={f.tier ?? 0}>
      {f.accepting_students && (
        <FadeUp>
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold">{t('acceptingStudents')}</h2>
            {f.teaching_styles && f.teaching_styles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {f.teaching_styles.map((style: string) => (
                  <span key={style} className="px-3 py-1.5 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-xs border border-[var(--color-gold)]/20">
                    {style}
                  </span>
                ))}
              </div>
            )}
            {localized(f as Record<string, unknown>, 'teaching_description', locale) && (
              <p className="text-sm text-[#C4BFB3] leading-relaxed">
                {localized(f as Record<string, unknown>, 'teaching_description', locale)}
              </p>
            )}
            {f.lesson_price_range && (
              <p className="text-sm text-[var(--muted-foreground)]">
                {t('lessonPriceRange')}: <span className="text-[var(--color-gold)]">{f.lesson_price_range}</span>
              </p>
            )}
          </section>
        </FadeUp>
      )}
      </TierGate>

      {/* ═══ Gear Section ═══ */}
      <TierGate entityType="artist" featureKey="gear_showcase" currentTier={f.tier ?? 0}>
      {artistGear.length > 0 && (
        <FadeUp>
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold">{t('gear')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {artistGear.map((g) => (
                <div key={g.id} className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
                  {g.photo_url ? (
                    <Image src={g.photo_url} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 19V6l12-3v13M9 19c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2zm12-3c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{g.gear_name}</p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">
                      {[g.brand, g.model].filter(Boolean).join(' · ') || g.gear_type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </FadeUp>
      )}
      </TierGate>

      {/* ═══ Shoutouts ═══ */}
      <FadeUp>
        <section className="border-t border-[var(--border)] pt-12">
          <ArtistShoutoutsSection artistId={artist.id} />
        </section>
      </FadeUp>

      {/* ═══ Featured In (Magazine Articles) ═══ */}
      <ArtistMagazineSection artistId={artist.id} />

      {/* ═══ Similar Artists ═══ */}
      {similarArtists.length > 0 && (
        <FadeUp>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-6">{t('similarArtists')}</h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {similarArtists.map((sa) => (
                <Link
                  key={sa.id}
                  href={`/${locale}/artists/${sa.id}`}
                  className="shrink-0 w-28 text-center group"
                >
                  {photoUrl(sa.fields.photo_url) ? (
                    <Image
                      src={photoUrl(sa.fields.photo_url)!}
                      alt={artistDisplayName(sa.fields, locale)}
                      width={64} height={64}
                      className="w-16 h-16 rounded-full object-cover mx-auto border border-[var(--border)] group-hover:border-gold/30 transition-colors"
                      sizes="64px"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[var(--card)] border border-[var(--border)] mx-auto flex items-center justify-center text-lg group-hover:border-gold/30 transition-colors">
                      ♪
                    </div>
                  )}
                  <p className="text-xs font-medium mt-2 truncate group-hover:text-gold transition-colors">
                    {artistDisplayName(sa.fields, locale)}
                  </p>
                  {sa.fields.primary_instrument && (
                    <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                      {instLabel(sa.fields.primary_instrument)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        </FadeUp>
      )}

      {/* ═══ Badges ═══ */}
      {artistBadgeProgress.length > 0 && (
        <FadeUp>
          <section className="pt-4" id="badges-section">
            <BadgeCategorySection
              title={t('badgesCategoryRecognition')}
              categoryKey="recognition"
              badges={artistBadgeProgress}
              earnedOnly
            />
          </section>
        </FadeUp>
      )}

      {/* ═══ Page View Tracker ═══ */}
      <PageViewTracker artistId={artist.id} />

      {/* ═══ Prev / Next Navigation ═══ */}
      <RecordNav
        prevHref={prevArtist ? `/${locale}/artists/${prevArtist.id}` : null}
        prevTitle={prevArtist ? artistDisplayName(prevArtist.fields, locale) : null}
        nextHref={nextArtist ? `/${locale}/artists/${nextArtist.id}` : null}
        nextTitle={nextArtist ? artistDisplayName(nextArtist.fields, locale) : null}
        prevLabel={t('prevArtist')}
        nextLabel={t('nextArtist')}
      />
      </div>
    </div>
  );
}
