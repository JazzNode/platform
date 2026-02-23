export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getArtists, getEvents, getVenues, getBadges, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, photoUrl, localized } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artists = await getArtists();
  const artist = artists.find((a) => a.id === slug);
  return { title: artist ? displayName(artist.fields) : 'Artist' };
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');

  const [artists, events, venues, badges] = await Promise.all([getArtists(), getEvents(), getVenues(), getBadges()]);
  const artist = artists.find((a) => a.id === slug);

  if (!artist) {
    return (
      <div className="py-24 text-center">
        <p className="text-[#8A8578]">Artist not found.</p>
        <Link href={`/${locale}/artists`} className="text-gold mt-4 inline-block link-lift">← Back to artists</Link>
      </div>
    );
  }

  const f = artist.fields;
  const bioShort = localized(f as Record<string, unknown>, 'bio_short', locale);
  const bioFull = localized(f as Record<string, unknown>, 'bio', locale);
  const desc = localized(f as Record<string, unknown>, 'description', locale);
  const artistEvents = resolveLinks(f.event_list, events)
    .sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''));
  const artistBadges = resolveLinks(f.badge_list, badges);

  return (
    <div className="space-y-12">
      <Link href={`/${locale}/artists`} className="text-sm text-[#8A8578] hover:text-gold transition-colors link-lift">
        ← {t('backToList')}
      </Link>

      {/* Profile */}
      <FadeUp>
      <div className="flex flex-col md:flex-row gap-10 items-start">
        {/* Photo */}
        {photoUrl(f.photo_url, f.photo_file) ? (
          <div className="w-48 h-48 rounded-2xl overflow-hidden shrink-0 border border-[rgba(240,237,230,0.08)]">
            <img src={photoUrl(f.photo_url, f.photo_file)!} alt={displayName(f)} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-48 h-48 rounded-2xl bg-[#111111] flex items-center justify-center text-6xl shrink-0 border border-[rgba(240,237,230,0.08)]">
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
                🎵 {f.primary_instrument}
              </span>
            )}
            {f.type && (
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                {f.type === 'person' ? '👤 Solo' : f.type === 'big band' ? '🎺 Big Band' : '👥 Group'}
              </span>
            )}
            {f.country_code && (
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                🌍 {f.country_code}
              </span>
            )}
            {f.is_master && (
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gold text-[#0A0A0A] font-bold">
                🌟 Master
              </span>
            )}
          </div>

          {/* Badges */}
          {artistBadges.length > 0 && (
            <div className="flex gap-2">
              {artistBadges.map((b) => (
                <span key={b.id} className="text-xs px-3 py-1.5 rounded-xl bg-[#1A1A1A] text-gold border border-gold/20">
                  {locale === 'zh' ? b.fields.name_zh : locale === 'ja' ? b.fields.name_ja : b.fields.name_en}
                </span>
              ))}
            </div>
          )}

          {/* Genres */}
          {f.genres && f.genres.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {f.genres.map((g) => (
                <span key={g} className="text-xs px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.08)] text-[#8A8578]">{g}</span>
              ))}
            </div>
          )}

          {/* Bio */}
          {bioShort && <p className="text-[#F0EDE6] font-medium text-lg leading-relaxed">{bioShort}</p>}
          {bioFull && (
            <div className="border-t border-[rgba(240,237,230,0.06)] pt-5">
              <p className="text-[#C4BFB3] leading-relaxed whitespace-pre-line">{bioFull}</p>
            </div>
          )}
          {!bioFull && desc && (
            <div className="border-t border-[rgba(240,237,230,0.06)] pt-5">
              <p className="text-[#C4BFB3] leading-relaxed">{desc}</p>
            </div>
          )}

          {/* Social links */}
          <div className="flex gap-4 text-sm">
            {f.website_url && <a href={f.website_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-[#E8C868] link-lift">🌐 Website</a>}
            {f.spotify_url && <a href={f.spotify_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-[#E8C868] link-lift">🎧 Spotify</a>}
            {f.youtube_url && <a href={f.youtube_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-[#E8C868] link-lift">▶️ YouTube</a>}
            {f.instagram && <a href={`https://instagram.com/${f.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-[#E8C868] link-lift">📸 Instagram</a>}
            {f.facebook_url && <a href={f.facebook_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-[#E8C868] link-lift">👤 Facebook</a>}
          </div>
        </div>
      </div>

      </FadeUp>

      {/* Events */}
      <FadeUp stagger={0.12}>
      <section className="border-t border-[rgba(240,237,230,0.06)] pt-12">
        <h2 className="font-serif text-2xl font-bold mb-8">{t('events')} ({artistEvents.length})</h2>
        {artistEvents.length === 0 ? (
          <p className="text-[#8A8578]">{t('noEvents')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artistEvents.slice(0, 12).map((event) => {
              const tz = event.fields.timezone || 'Asia/Taipei';
              const venue = resolveLinks(event.fields.venue_id, venues)[0];
              return (
                <Link key={event.id} href={`/${locale}/events/${event.id}`} className="block bg-[#111111] p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover group">
                  <div className="text-xs uppercase tracking-widest text-gold mb-2">
                    {formatDate(event.fields.start_at, locale, tz)}
                  </div>
                  <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300">
                    {event.fields.title || event.fields.title_local || 'Event'}
                  </h3>
                  {venue && <p className="text-xs text-[#8A8578] mt-1">↗ {displayName(venue.fields)}</p>}
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
