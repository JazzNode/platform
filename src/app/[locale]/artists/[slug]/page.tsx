export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getArtists, getEvents, getVenues, getBadges, getLineups, getCities, getTags, resolveLinks, buildMap, getArtistGear } from '@/lib/supabase';
import { displayName, artistDisplayName, artistDisplayNameField, formatDate, formatTime, photoUrl, localized, cityName, eventTitle, normalizeInstrumentKey, parseSpotifyEmbedUrl, parseYouTubeVideoId } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import ArtistPhotoUpload from '@/components/ArtistPhotoUpload';
import SocialIcons from '@/components/SocialIcons';
import CollapsibleSection from '@/components/CollapsibleSection';
import FollowButton from '@/components/FollowButton';
import ClaimButton from '@/components/ClaimButton';
import BadgeDock from '@/components/BadgeDock';
import EditableContent from '@/components/EditableContent';
import EditableName from '@/components/EditableName';
import RecordNav from '@/components/RecordNav';
import ContactArtistButton from '@/components/ContactArtistButton';
import PageViewTracker from '@/components/PageViewTracker';
import HireMeButton from '@/components/HireMeButton';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const artists = await getArtists();
  const artist = artists.find((a) => a.id === slug);
  const name = artist ? artistDisplayName(artist.fields, locale) : 'Artist';
  const bio = artist ? (localized(artist.fields as Record<string, unknown>, 'bio', locale) || localized(artist.fields as Record<string, unknown>, 'bio_short', locale) || '') : '';
  const ogParams = new URLSearchParams({ name });
  if (artist?.fields.primary_instrument) ogParams.set('instrument', artist.fields.primary_instrument);
  if (artist?.fields.photo_url) ogParams.set('photo', artist.fields.photo_url);
  const ogUrl = `/api/og/artist?${ogParams.toString()}`;
  return {
    title: name,
    ...(bio && { description: bio.slice(0, 160) }),
    openGraph: { images: [{ url: ogUrl, width: 1200, height: 630 }] },
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
  const artist = artists.find((a) => a.id === slug);

  // Legacy URL redirect: old Airtable record IDs → semantic slugs
  if (!artist && slug.startsWith('rec')) {
    const legacy = artists.find((a) => (a.fields as Record<string, unknown>).airtable_record_id === slug);
    if (legacy) redirect(`/${locale}/artists/${legacy.id}`);
  }

  if (!artist) {
    notFound();
  }

  // Fetch gear for this artist
  const artistGear = await getArtistGear(artist.id);

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

  // ── Badges ──
  const artistBadges = resolveLinks(f.badge_list, badges);
  const badgeItems = artistBadges.map((b) => ({
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
  const topCollaborators = [...coAppearances.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const a = artists.find((x) => x.id === id);
      return a ? { id, count, fields: a.fields } : null;
    })
    .filter(Boolean) as { id: string; count: number; fields: typeof f }[];

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
      <Link href={`/${locale}/artists`} className="mb-8 inline-block text-sm text-[#8A8578] hover:text-gold transition-colors link-lift">
        {t('backToList')}
      </Link>

      <div className="space-y-12">
      {/* ═══ Profile ═══ */}
      <FadeUp>
        <div className="flex flex-col md:flex-row gap-10 items-start">
          {/* Photo */}
          <ArtistPhotoUpload
            artistId={artist.id}
            artistName={artistDisplayName(f, locale)}
            currentPhotoUrl={photoUrl(f.photo_url)}
            size="md"
          />

          <div className="flex-1 space-y-5">
            <div>
              <div className="flex items-start justify-between gap-4">
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
                <div className="flex items-center gap-2 shrink-0">
                  {f.available_for_hire && (
                    <HireMeButton artistId={artist.id} artistName={artistDisplayName(f, locale)} />
                  )}
                  <ContactArtistButton artistId={artist.id} artistName={artistDisplayName(f, locale)} />
                  <ClaimButton targetType="artist" targetId={artist.id} targetName={artistDisplayName(f, locale)} />
                  <FollowButton itemType="artist" itemId={artist.id} variant="full" />
                </div>
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
                  className="mt-1 text-xl text-[#8A8578]"
                  tag="p"
                />
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {f.primary_instrument && (
                <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-gold/30 text-gold capitalize">
                  {instLabel(f.primary_instrument)}
                </span>
              )}
              {f.type && (
                <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                  {f.type === 'person' ? t('musicians') : f.type === 'big band' ? t('bigBands') : t('groups')}
                </span>
              )}
              {f.country_code && (
                <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                  {f.country_code}
                </span>
              )}
              {f.is_master && (
                <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gold text-[#0A0A0A] font-bold">
                  Master
                </span>
              )}
              {f.verification_status === 'Verified' && (
                <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gold text-[#0A0A0A] font-bold">
                  &#10003; {t('verified')}
                </span>
              )}
            </div>

            {/* Unclaimed notice */}
            {(!f.tier || f.tier === 0) && f.verification_status !== 'Verified' && (
              <p className="text-xs text-[#8A8578] italic">
                {t('unclaimedArtistNotice')}
              </p>
            )}

            {/* Bio */}
            <EditableContent
              entityType="artist"
              entityId={artist.id}
              fieldPrefix="bio"
              locale={locale}
              content={bioFull}
              shortContent={bioShort}
              contentClassName="text-[#C4BFB3] leading-relaxed whitespace-pre-line"
              shortContentClassName="text-[#F0EDE6] font-medium text-lg leading-relaxed"
              wrapperClassName="border-t border-[var(--border)] pt-5"
            />
            {!bioFull && desc && (
              <div className="border-t border-[var(--border)] pt-5">
                <p className="text-[#C4BFB3] leading-relaxed">{desc}</p>
              </div>
            )}

            {/* Social Icons */}
            <SocialIcons
              websiteUrl={f.website_url}
              spotifyUrl={f.spotify_url}
              youtubeUrl={f.youtube_url}
              instagram={f.instagram}
              facebookUrl={f.facebook_url}
            />
          </div>
        </div>
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
                            <p className="text-sm text-[#8A8578] mt-1">YouTube</p>
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

      {/* ═══ Members (group / big band only) ═══ */}
      {isGroupType && groupMembers.length > 0 && (
        <FadeUp>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8">{t('members')}</h2>
            <div className="space-y-2">
              {groupMembers.map((member) => (
                <Link
                  key={member.id}
                  href={`/${locale}/artists/${member.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--card)] transition-colors group"
                >
                  {photoUrl(member.fields.photo_url) ? (
                    <Image
                      src={photoUrl(member.fields.photo_url)!}
                      alt={artistDisplayName(member.fields, locale)}
                      width={36} height={36}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-[var(--border)]"
                      sizes="36px"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[var(--card)] flex items-center justify-center text-sm shrink-0 border border-[var(--border)]">
                      ♪
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium group-hover:text-gold transition-colors truncate block">
                      {artistDisplayName(member.fields, locale)}
                    </span>
                    {member.instruments.length > 0 && (
                      <span className="text-xs text-[#8A8578]">
                        {member.instruments.map((i) => instLabel(i)).join(', ')}
                      </span>
                    )}
                  </div>
                  {member.role === 'bandleader' && (
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/20 shrink-0">
                      {t('bandleader')}
                    </span>
                  )}
                  {member.fields.primary_instrument && member.instruments.length === 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-lg border border-[var(--border)] text-[#8A8578] shrink-0">
                      {instLabel(member.fields.primary_instrument)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        </FadeUp>
      )}

      {/* ═══ Upcoming Gigs ═══ */}
      {upcomingEvents.length > 0 && (
        <FadeUp>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
              <span className="pulse-dot" />
              {t('upcomingGigs')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                const eventTags = resolveLinks(event.fields.tag_list, tagMap)
                  .map((tag) => tag.fields.name)
                  .filter(Boolean) as string[];

                return (
                  <FadeUpItem key={event.id} delay={(i % 3) * 60}>
                  <Link href={`/${locale}/events/${event.id}`} className="block bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] card-hover group h-full">
                    {venue && (
                      <p className="text-[10px] uppercase tracking-widest text-[#8A8578] mb-1">{displayName(venue.fields)}</p>
                    )}
                    <div className="text-xs uppercase tracking-widest text-gold mb-2">
                      {eventTags.includes('matinee') && '☀️ '}{formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                    </div>
                    <h3 className="font-serif text-lg font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
                      {eventTitle(event.fields, locale)}
                    </h3>
                    {sidemen.length > 0 && (
                      <p className="text-xs text-[#6A6560] mt-2">
                        w/ {sidemen.join(', ')}
                      </p>
                    )}
                    {eventTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {eventTags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold/8 text-gold/70 border border-gold/15"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {event.fields.source_url && (
                      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gold group-hover:text-[#E8C868] transition-colors">
                        {t('getTickets')} ↗
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
              <p className="text-[#8A8578] text-sm mb-6">{t('noEvents')}</p>
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
                      <div className="text-xs text-[#8A8578] mb-1">
                        {formatDate(event.fields.start_at, locale, tz)}
                      </div>
                      <h3 className="text-sm font-medium group-hover:text-gold transition-colors duration-300 line-clamp-1">
                        {eventTitle(event.fields, locale)}
                      </h3>
                      {venue && <p className="text-xs text-[#8A8578]/60 mt-0.5">{displayName(venue.fields)}</p>}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleSection>
          </section>
        </FadeUp>
      )}

      {/* ═══ Jazz Network ═══ */}
      {hasNetwork && (
        <FadeUp>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8">{t('jazzNetwork')}</h2>

            <div className="space-y-8">
              {/* Versatility: Leader / Sideman */}
              {hasVersatility && (
                <div className="space-y-4">
                  {leaderProjects.length > 0 && (
                    <div>
                      <h3 className="text-xs uppercase tracking-widest text-[#8A8578] mb-3">{t('asLeader')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {leaderProjects.map((p) => (
                          <Link
                            key={p.id}
                            href={`/${locale}/artists/${p.id}`}
                            className="text-sm px-3 py-1.5 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/20 hover:border-[var(--color-gold)]/40 transition-colors link-lift"
                          >
                            {artistDisplayName(p.fields, locale)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {sidemanProjects.length > 0 && (
                    <div>
                      <h3 className="text-xs uppercase tracking-widest text-[#8A8578] mb-3">{t('asSideman')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {sidemanProjects.map((p) => (
                          <Link
                            key={p.id}
                            href={`/${locale}/artists/${p.id}`}
                            className="text-sm px-3 py-1.5 rounded-xl border border-[var(--border)] text-[#C4BFB3] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/20 transition-colors link-lift"
                          >
                            {artistDisplayName(p.fields, locale)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {featuredGuestProjects.length > 0 && (
                    <div>
                      <h3 className="text-xs uppercase tracking-widest text-[#8A8578] mb-3">{t('asFeaturedGuest')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {featuredGuestProjects.map((p) => (
                          <Link
                            key={p.id}
                            href={`/${locale}/artists/${p.id}`}
                            className="text-sm px-3 py-1.5 rounded-xl border border-[var(--border)] text-[#C4BFB3] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/20 transition-colors link-lift"
                          >
                            {artistDisplayName(p.fields, locale)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {bandMemberProjects.length > 0 && (
                    <div>
                      <h3 className="text-xs uppercase tracking-widest text-[#8A8578] mb-3">{t('asBandMember')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {bandMemberProjects.map((p) => (
                          <Link
                            key={p.id}
                            href={`/${locale}/artists/${p.id}`}
                            className="text-sm px-3 py-1.5 rounded-xl border border-[var(--border)] text-[#C4BFB3] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/20 transition-colors link-lift"
                          >
                            {artistDisplayName(p.fields, locale)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Frequent Collaborators */}
              {topCollaborators.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-[#8A8578] mb-4">{t('frequentCollaborators')}</h3>
                  <div className="space-y-2">
                    {topCollaborators.map((collab) => (
                      <Link
                        key={collab.id}
                        href={`/${locale}/artists/${collab.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--card)] transition-colors group"
                      >
                        {/* Avatar */}
                        {photoUrl(collab.fields.photo_url) ? (
                          <Image
                            src={photoUrl(collab.fields.photo_url)!}
                            alt={artistDisplayName(collab.fields, locale)}
                            width={36} height={36}
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-[var(--border)]"
                            sizes="36px"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[var(--card)] flex items-center justify-center text-sm shrink-0 border border-[var(--border)]">
                            ♪
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium group-hover:text-gold transition-colors truncate block">
                            {artistDisplayName(collab.fields, locale)}
                          </span>
                          <span className="text-xs text-[#8A8578]">
                            {collab.count} {t('gigsCount')}
                          </span>
                        </div>
                        {collab.fields.primary_instrument && (
                          <span className="text-xs px-2 py-0.5 rounded-lg border border-[var(--border)] text-[#8A8578] shrink-0">
                            {instLabel(collab.fields.primary_instrument)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </FadeUp>
      )}

      {/* ═══ Active Hubs ═══ */}
      {hasHubs && (
        <FadeUp>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
              {t('activeHubs')}
              {isGlobetrotter && (
                <span className="text-xs font-normal uppercase tracking-widest px-3 py-1 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/20">
                  {t('globetrotter')}
                </span>
              )}
            </h2>

            <div className="space-y-4">
              {/* Venues */}
              {venuesWithCounts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {venuesWithCounts.slice(0, 8).map((v) => (
                    <Link
                      key={v.id}
                      href={`/${locale}/venues/${v.id}`}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-[var(--border)] text-[#C4BFB3] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/20 transition-colors link-lift"
                    >
                      <span>{displayName(v.fields)}</span>
                      {v.gigCount > 0 && (
                        <span className="text-xs text-[#8A8578]">x{v.gigCount}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {/* Cities */}
              {artistCities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {artistCities.map((c) => (
                    <span
                      key={c.id}
                      className="text-xs px-3 py-1.5 rounded-xl bg-[var(--card)] text-[#8A8578] border border-[var(--border)]"
                    >
                      {cityName(c.fields, locale)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        </FadeUp>
      )}

      {/* ═══ Teaching Section ═══ */}
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

      {/* ═══ Gear Section ═══ */}
      {artistGear.length > 0 && (
        <FadeUp>
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold">{t('gear')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {artistGear.map((g) => (
                <div key={g.id} className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
                  {g.photo_url ? (
                    <img src={g.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
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

      {/* ═══ Badge Dock ═══ */}
      {badgeItems.length > 0 && (
        <FadeUp>
          <section className="pt-4">
            <BadgeDock badges={badgeItems} />
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
