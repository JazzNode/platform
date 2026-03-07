import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { getProfileByUsername, getPublicFavorites } from '@/lib/profile';
import { getArtists, getVenues, getEvents, getCities, resolveLinks, buildMap } from '@/lib/airtable';
import { displayName, artistDisplayName, formatDate, photoUrl, cityName, eventTitle } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  return {
    title: profile?.display_name || `@${username}`,
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ locale: string; username: string }> }) {
  const { locale, username } = await params;
  const t = await getTranslations('profile');
  const tCommon = await getTranslations('common');
  const tInst = await getTranslations('instruments');
  const instLabel = (key: string) => { try { return tInst(key as never); } catch { return key; } };
  const profile = await getProfileByUsername(username);

  if (!profile) {
    return (
      <div className="py-24 text-center">
        <p className="text-[#8A8578]">{t('notFound')}</p>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    locale === 'zh' ? 'zh-TW' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'long' },
  );

  // Fetch favorites and resolve to Airtable data
  const [favorites, artists, venues, events, cities] = await Promise.all([
    getPublicFavorites(profile.id),
    getArtists(),
    getVenues(),
    getEvents(),
    getCities(),
  ]);

  const artistMap = buildMap(artists);
  const venueMap = buildMap(venues);
  const cityMap = buildMap(cities);

  // Resolve followed artists
  const followedArtistIds = new Set(favorites.filter((f) => f.item_type === 'artist').map((f) => f.item_id));
  const followedArtists = artists.filter((a) => followedArtistIds.has(a.id));

  // Resolve followed venues
  const followedVenueIds = new Set(favorites.filter((f) => f.item_type === 'venue').map((f) => f.item_id));
  const followedVenues = venues.filter((v) => followedVenueIds.has(v.id));

  // Resolve bookmarked events
  const bookmarkedEventIds = new Set(favorites.filter((f) => f.item_type === 'event').map((f) => f.item_id));
  const bookmarkedEvents = events
    .filter((e) => bookmarkedEventIds.has(e.id))
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));

  const hasFollows = followedArtists.length > 0 || followedVenues.length > 0;
  const hasBookmarks = bookmarkedEvents.length > 0;

  return (
    <div className="space-y-12">
      {/* ═══ Profile Header — mirrors artist detail layout ═══ */}
      <FadeUp>
        <div className="flex flex-col md:flex-row gap-10 items-start">
          {/* Avatar */}
          <div className="w-48 h-48 rounded-2xl overflow-hidden shrink-0 border border-[var(--border)]">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name || username}
                width={192}
                height={192}
                className="object-cover w-full h-full"
                sizes="192px"
              />
            ) : (
              <div className="w-full h-full bg-[var(--card)] flex items-center justify-center text-6xl text-[var(--muted-foreground)]">
                {(profile.display_name || username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-5">
            {/* Name */}
            <h1 className="font-serif text-4xl sm:text-5xl font-bold">
              {profile.display_name || `@${username}`}
            </h1>
            {profile.display_name && (
              <p className="text-xl text-[#8A8578]">@{username}</p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                {t('memberSince', { date: memberSince })}
              </span>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="border-t border-[var(--border)] pt-5">
                <p className="text-[#C4BFB3] leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {/* Website */}
            {profile.website && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#8A8578]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors link-lift"
                >
                  {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </div>
            )}
          </div>
        </div>
      </FadeUp>

      {/* ═══ Follows (Artists & Venues) ═══ */}
      <FadeUp>
        <section className="border-t border-[var(--border)] pt-12">
          <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {t('follows')}
          </h2>

          {!hasFollows ? (
            <p className="text-[#8A8578] text-sm">{t('noFollows')}</p>
          ) : (
            <div className="space-y-6">
              {/* Followed Artists */}
              {followedArtists.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {followedArtists.map((artist) => (
                    <Link
                      key={artist.id}
                      href={`/${locale}/artists/${artist.id}`}
                      className="flex items-center gap-3 bg-[var(--card)] px-4 py-2.5 rounded-xl border border-[var(--border)] hover:border-gold/30 transition-colors group"
                    >
                      {photoUrl(artist.fields.photo_url, artist.fields.photo_file) ? (
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                          <Image src={photoUrl(artist.fields.photo_url, artist.fields.photo_file)!} alt="" width={32} height={32} className="object-cover w-full h-full" sizes="32px" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-sm shrink-0 border border-[var(--border)]">♪</div>
                      )}
                      <div>
                        <span className="text-sm font-medium group-hover:text-gold transition-colors">{artistDisplayName(artist.fields, locale)}</span>
                        {artist.fields.primary_instrument && (
                          <span className="text-[10px] uppercase tracking-widest text-gold ml-2">{instLabel(artist.fields.primary_instrument)}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Followed Venues */}
              {followedVenues.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {followedVenues.map((venue) => {
                    const city = resolveLinks(venue.fields.city_id, cityMap)[0];
                    return (
                      <Link
                        key={venue.id}
                        href={`/${locale}/venues/${venue.id}`}
                        className="flex items-center gap-3 bg-[var(--card)] px-4 py-2.5 rounded-xl border border-[var(--border)] hover:border-gold/30 transition-colors group"
                      >
                        {photoUrl(venue.fields.photo_url, venue.fields.photo_file) ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                            <Image src={photoUrl(venue.fields.photo_url, venue.fields.photo_file)!} alt="" width={32} height={32} className="object-cover w-full h-full" sizes="32px" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-sm shrink-0 border border-[var(--border)]">🎵</div>
                        )}
                        <div>
                          <span className="text-sm font-medium group-hover:text-gold transition-colors">{displayName(venue.fields)}</span>
                          {city && (
                            <span className="text-[10px] uppercase tracking-widest text-[#8A8578] ml-2">📍 {cityName(city.fields, locale)}</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </FadeUp>

      {/* ═══ Bookmarks (Events) ═══ */}
      <FadeUp>
        <section className="border-t border-[var(--border)] pt-12">
          <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            {t('bookmarks')}
          </h2>

          {!hasBookmarks ? (
            <p className="text-[#8A8578] text-sm">{t('noBookmarks')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bookmarkedEvents.map((event) => {
                const f = event.fields;
                const tz = f.timezone || 'Asia/Taipei';
                const venue = resolveLinks(f.venue_id, venueMap)[0];
                const d = f.start_at ? new Date(f.start_at) : null;
                const dateStr = d ? d.toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', timeZone: tz }) : '';
                const timeStr = d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }) : '';

                return (
                  <Link
                    key={event.id}
                    href={`/${locale}/events/${event.id}`}
                    className="block bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] card-hover group"
                  >
                    {venue && (
                      <p className="text-[10px] uppercase tracking-widest text-[#8A8578] mb-1">{displayName(venue.fields)}</p>
                    )}
                    <div className="text-xs uppercase tracking-widest text-gold mb-2">
                      {dateStr} · {timeStr}
                    </div>
                    <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
                      {eventTitle(f, locale)}
                    </h3>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </FadeUp>
    </div>
  );
}
