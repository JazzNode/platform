export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { getArtists, getEvents, getVenues, getBadges, getLineups, getCities, getTags, resolveLinks, buildMap } from '@/lib/airtable';
import { displayName, artistDisplayName, artistDisplayNameField, formatDate, formatTime, photoUrl, localized, cityName, eventTitle } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import ArtistPhotoUpload from '@/components/ArtistPhotoUpload';
import SocialIcons from '@/components/SocialIcons';
import CollapsibleSection from '@/components/CollapsibleSection';
import FollowButton from '@/components/FollowButton';
import BadgeDock from '@/components/BadgeDock';
import EditableContent from '@/components/EditableContent';
import EditableName from '@/components/EditableName';
import RecordNav from '@/components/RecordNav';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artists = await getArtists();
  const artist = artists.find((a) => a.id === slug);
  return { title: artist ? (artist.fields.name_en || artist.fields.name_local || 'Artist') : 'Artist' };
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');
  const tInst = await getTranslations('instruments');
  const instLabel = (key: string) => { try { return tInst(key as never); } catch { return key; } };

  const [artists, events, venues, badges, lineups, cities, tags] = await Promise.all([
    getArtists(), getEvents(), getVenues(), getBadges(), getLineups(), getCities(), getTags().catch(() => []),
  ]);
  const artist = artists.find((a) => a.id === slug);

  if (!artist) {
    return (
      <div className="py-24 text-center">
        <p className="text-[#8A8578]">Artist not found.</p>
        <Link href={`/${locale}/artists`} className="text-gold mt-4 inline-block link-lift">{t('backToList')}</Link>
      </div>
    );
  }

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

  return (
    <div className="space-y-12">
      <Link href={`/${locale}/artists`} className="text-sm text-[#8A8578] hover:text-gold transition-colors link-lift">
        {t('backToList')}
      </Link>

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
            <div className="flex items-start justify-between gap-4">
              <EditableName
                entityType="artist"
                entityId={artist.id}
                field={artistDisplayNameField(f, locale)}
                value={artistDisplayName(f, locale)}
                className="font-serif text-4xl sm:text-5xl font-bold"
                tag="h1"
              />
              <FollowButton itemType="artist" itemId={artist.id} variant="full" />
            </div>
            {f.name_en && f.name_local && f.name_en !== f.name_local && (
              <EditableName
                entityType="artist"
                entityId={artist.id}
                field="name_en"
                value={f.name_en}
                className="text-xl text-[#8A8578]"
                tag="p"
              />
            )}

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
            </div>

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

      {/* ═══ Badge Dock ═══ */}
      {(badgeItems.length > 0 || (f.genres && f.genres.length > 0)) && (
        <FadeUp>
          <section className="pt-4">
            <BadgeDock badges={badgeItems} genres={f.genres} />
          </section>
        </FadeUp>
      )}

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
  );
}
