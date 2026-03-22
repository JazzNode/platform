import Image from 'next/image';
import Link from 'next/link';
import { getPublicFollows, getUserReviews } from '@/lib/profile';
import type { Profile } from '@/lib/profile';
import { getArtists, getVenues, getEvents, getCities, resolveLinks, buildMap } from '@/lib/supabase';
import { displayName, artistDisplayName, photoUrl, cityName, eventTitle, normalizeInstrumentKey } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import DMButton from '@/components/DMButton';
import FollowButton from '@/components/FollowButton';
import ShareButton from '@/components/ShareButton';
import SocialIcons from '@/components/SocialIcons';

interface Props {
  profile: Profile;
  locale: string;
  t: (key: string, values?: Record<string, string>) => string;
  tInst: (key: string) => string;
}

export default async function PublicProfileContent({ profile, locale, t, tInst }: Props) {
  const instLabel = (key: string) => { const k = normalizeInstrumentKey(key); try { return tInst(k as never); } catch { return k; } };
  const username = profile.username || profile.id;

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    locale === 'zh' ? 'zh-TW' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'long' },
  );

  const [follows, artists, venues, events, cities, reviews] = await Promise.all([
    getPublicFollows(profile.id),
    getArtists(),
    getVenues(),
    getEvents(),
    getCities(),
    getUserReviews(profile.id, true),
  ]);

  const venueMap = buildMap(venues);
  const cityMap = buildMap(cities);

  const followedArtistIds = new Set(follows.filter((f) => f.target_type === 'artist').map((f) => f.target_id));
  const followedArtists = artists.filter((a) => followedArtistIds.has(a.id));

  const followedVenueIds = new Set(follows.filter((f) => f.target_type === 'venue').map((f) => f.target_id));
  const followedVenues = venues.filter((v) => followedVenueIds.has(v.id));

  const bookmarkedEventIds = new Set(follows.filter((f) => f.target_type === 'event').map((f) => f.target_id));
  const bookmarkedEvents = events
    .filter((e) => bookmarkedEventIds.has(e.id))
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));

  const hasFollows = followedArtists.length > 0 || followedVenues.length > 0;
  const hasBookmarks = bookmarkedEvents.length > 0;

  return (
    <div className="space-y-12">
      {/* Profile Header */}
      <FadeUp>
        <div className="flex flex-col md:flex-row gap-10 items-start">
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
            <div>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold">
                {profile.display_name || `@${username}`}
              </h1>
              {profile.display_name && profile.username && (
                <p className="mt-1 text-xl text-[var(--muted-foreground)]">@{profile.username}</p>
              )}
            </div>

            {/* Tags + Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[var(--muted-foreground)]">
                {t('memberSince', { date: memberSince })}
              </span>
              <span className="text-[var(--muted-foreground)]/30 select-none">|</span>
              <DMButton targetUserId={profile.id} />
              <FollowButton itemType={"user" as "artist"} itemId={profile.id} variant="full" />
              <ShareButton title={profile.display_name || `@${username}`} url={`/${locale}/user/${username}`} variant="compact" label={t('share')} />
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="border-t border-[var(--border)] pt-5">
                <p className="text-[#C4BFB3] leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {/* Social Icons */}
            <SocialIcons
              websiteUrl={profile.website || profile.social_links?.website_url}
              spotifyUrl={profile.social_links?.spotify_url}
              youtubeUrl={profile.social_links?.youtube_url}
              instagram={profile.social_links?.instagram}
              facebookUrl={profile.social_links?.facebook_url}
            />
          </div>
        </div>
      </FadeUp>

      {/* Follows */}
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
            <p className="text-[var(--muted-foreground)] text-sm">{t('noFollows')}</p>
          ) : (
            <div className="space-y-6">
              {followedArtists.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {followedArtists.map((artist) => (
                    <Link
                      key={artist.id}
                      href={`/${locale}/artists/${artist.id}`}
                      className="flex items-center gap-3 bg-[var(--card)] px-4 py-2.5 rounded-xl border border-[var(--border)] hover:border-gold/30 transition-colors group"
                    >
                      {photoUrl(artist.fields.photo_url) ? (
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                          <Image src={photoUrl(artist.fields.photo_url)!} alt={artistDisplayName(artist.fields, locale)} width={32} height={32} className="object-cover w-full h-full" sizes="32px" />
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
                        {photoUrl(venue.fields.photo_url) ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                            <Image src={photoUrl(venue.fields.photo_url)!} alt={displayName(venue.fields)} width={32} height={32} className="object-cover w-full h-full" sizes="32px" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-sm shrink-0 border border-[var(--border)]">🎵</div>
                        )}
                        <div>
                          <span className="text-sm font-medium group-hover:text-gold transition-colors">{displayName(venue.fields)}</span>
                          {city && (
                            <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] ml-2">📍 {cityName(city.fields, locale)}</span>
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

      {/* Bookmarks */}
      <FadeUp>
        <section className="border-t border-[var(--border)] pt-12">
          <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            {t('bookmarks')}
          </h2>

          {!hasBookmarks ? (
            <p className="text-[var(--muted-foreground)] text-sm">{t('noBookmarks')}</p>
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
                      <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{displayName(venue.fields)}</p>
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

      {/* Reviews */}
      <FadeUp>
        <section className="border-t border-[var(--border)] pt-12">
          <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {t('reviews')}
          </h2>

          {reviews.length === 0 ? (
            <p className="text-[var(--muted-foreground)] text-sm">{t('noReviews')}</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const venue = venueMap.get(review.venue_id);
                const dateStr = new Date(review.created_at).toLocaleDateString(
                  locale === 'zh' ? 'zh-TW' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US',
                  { year: 'numeric', month: 'short', day: 'numeric' },
                );
                return (
                  <Link
                    key={review.id}
                    href={`/${locale}/venues/${review.venue_id}`}
                    className="block bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] card-hover group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium group-hover:text-gold transition-colors">
                        {venue ? displayName(venue.fields) : t('unknownVenue')}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < review.rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={i < review.rating ? 'text-gold' : 'text-[var(--muted-foreground)]/30'}>
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      ))}
                    </div>
                    {review.text && (
                      <p className="text-sm text-[#C4BFB3] leading-relaxed">{review.text}</p>
                    )}
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
