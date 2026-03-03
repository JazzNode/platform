export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { getArtists, getEvents, getVenues, getBadges, getLineups, getCities, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, photoUrl, localized, formatPriceBadge, cityName } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import SocialIcons from '@/components/SocialIcons';
import CollapsibleSection from '@/components/CollapsibleSection';
import BadgeDock from '@/components/BadgeDock';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artists = await getArtists();
  const artist = artists.find((a) => a.id === slug);
  return { title: artist ? displayName(artist.fields) : 'Artist' };
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');
  const tInst = await getTranslations('instruments');
  const instLabel = (key: string) => { try { return tInst(key as never); } catch { return key; } };

  const [artists, events, venues, badges, lineups, cities] = await Promise.all([
    getArtists(), getEvents(), getVenues(), getBadges(), getLineups(), getCities(),
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

  // ── Badges ──
  const artistBadges = resolveLinks(f.badge_list, badges);
  const badgeItems = artistBadges.map((b) => ({
    id: b.id,
    badgeId: b.fields.badge_id,
    name: (locale === 'zh' ? b.fields.name_zh : locale === 'ja' ? b.fields.name_ja : locale === 'ko' ? b.fields.name_ko : b.fields.name_en) || b.fields.name_en || '',
    description: (locale === 'zh' ? b.fields.description_zh : locale === 'ja' ? b.fields.description_ja : locale === 'ko' ? b.fields.description_ko : b.fields.description) || b.fields.description || '',
  }));

  // ── Versatility: bandleader / sideman ──
  const leaderProjects = resolveLinks(f.as_bandleader_list, artists);
  const sidemanProjects = resolveLinks(f.as_sideman_list, artists);
  const hasVersatility = leaderProjects.length > 0 || sidemanProjects.length > 0;

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
          {photoUrl(f.photo_url, f.photo_file) ? (
            <div className="w-48 h-48 rounded-2xl overflow-hidden shrink-0 border border-[var(--border)] relative">
              <Image src={photoUrl(f.photo_url, f.photo_file)!} alt={displayName(f)} fill className="object-cover" sizes="192px" />
            </div>
          ) : (
            <div className="w-48 h-48 rounded-2xl bg-[var(--card)] flex items-center justify-center text-6xl shrink-0 border border-[var(--border)]">
              ♪
            </div>
          )}

          <div className="flex-1 space-y-5">
            <h1 className="font-serif text-4xl sm:text-5xl font-bold">{displayName(f)}</h1>
            {f.name_en && f.name_local && f.name_en !== f.name_local && (
              <p className="text-xl text-[#8A8578]">{f.name_en}</p>
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
            {bioShort && <p className="text-[#F0EDE6] font-medium text-lg leading-relaxed">{bioShort}</p>}
            {bioFull && (
              <div className="border-t border-[var(--border)] pt-5">
                <p className="text-[#C4BFB3] leading-relaxed whitespace-pre-line">{bioFull}</p>
              </div>
            )}
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

      {/* ═══ Upcoming Gigs ═══ */}
      {upcomingEvents.length > 0 && (
        <FadeUp>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
              <span className="pulse-dot" />
              {t('upcomingGigs')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.slice(0, 6).map((event) => {
                const tz = event.fields.timezone || 'Asia/Taipei';
                const venue = resolveLinks(event.fields.venue_id, venues)[0];
                const price = formatPriceBadge(venue?.fields.currency, event.fields.price_info);
                return (
                  <div key={event.id} className="bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] card-hover group flex flex-col">
                    <Link href={`/${locale}/events/${event.id}`} className="flex-1">
                      <div className="text-xs uppercase tracking-widest text-gold mb-2">
                        {formatDate(event.fields.start_at, locale, tz)}
                      </div>
                      <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300">
                        {event.fields.title || event.fields.title_local || 'Event'}
                      </h3>
                      {venue && (
                        <p className="text-xs text-[#8A8578] mt-1">
                          {displayName(venue.fields)}
                        </p>
                      )}
                      {price && (
                        <p className="text-xs text-[#8A8578] mt-1">{price}</p>
                      )}
                    </Link>
                    {event.fields.source_url && (
                      <a
                        href={event.fields.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-gold)] hover:text-[#E8C868] transition-colors"
                      >
                        {t('getTickets')} ↗
                      </a>
                    )}
                  </div>
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
                        {event.fields.title || event.fields.title_local || 'Event'}
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
                            {displayName(p.fields)}
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
                            {displayName(p.fields)}
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
                        {photoUrl(collab.fields.photo_url, collab.fields.photo_file) ? (
                          <img
                            src={photoUrl(collab.fields.photo_url, collab.fields.photo_file)!}
                            alt={displayName(collab.fields)}
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-[var(--border)]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[var(--card)] flex items-center justify-center text-sm shrink-0 border border-[var(--border)]">
                            ♪
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium group-hover:text-gold transition-colors truncate block">
                            {displayName(collab.fields)}
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
    </div>
  );
}
