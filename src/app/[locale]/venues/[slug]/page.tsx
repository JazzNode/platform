export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getVenues, getEvents, getArtists, getBadges, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, formatTime, photoUrl, localized } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venues = await getVenues();
  const venue = venues.find((v) => v.id === slug);
  return { title: venue ? displayName(venue.fields) : 'Venue' };
}

export default async function VenueDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');

  const [venues, events, artists, badges] = await Promise.all([getVenues(), getEvents(), getArtists(), getBadges()]);
  const venue = venues.find((v) => v.id === slug);

  if (!venue) {
    return (
      <div className="py-24 text-center">
        <p className="text-[#8A8578]">Venue not found.</p>
        <Link href={`/${locale}/venues`} className="text-gold mt-4 inline-block link-lift">← Back to venues</Link>
      </div>
    );
  }

  const f = venue.fields;
  const desc = localized(f as Record<string, unknown>, 'description', locale);
  const venueEvents = resolveLinks(f.event_list, events)
    .sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''));
  const venueBadges = resolveLinks(f.badge_list, badges);

  return (
    <div className="space-y-12">
      <Link href={`/${locale}/venues`} className="text-sm text-[#8A8578] hover:text-gold transition-colors link-lift">
        ← {t('backToList')}
      </Link>

      {/* Hero */}
      <FadeUp>
      <div className="flex flex-col lg:flex-row gap-10">
        {photoUrl(f.photo_url, f.photo_file) && (
          <div className="w-full lg:w-[400px] shrink-0 overflow-hidden rounded-2xl">
            <img src={photoUrl(f.photo_url, f.photo_file)!} alt={displayName(f)} className="w-full h-auto object-cover" />
          </div>
        )}

        <div className="flex-1 space-y-5">
          <h1 className="font-serif text-4xl sm:text-5xl font-bold">{displayName(f)}</h1>
          {f.name_en && f.name_local && f.name_en !== f.name_local && (
            <p className="text-xl text-[#8A8578]">{f.name_en}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {f.city && (
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                📍 {f.city}
              </span>
            )}
            {f.jazz_frequency && (
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                🎵 {f.jazz_frequency}
              </span>
            )}
            {f.capacity && (
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                👥 {f.capacity}
              </span>
            )}
            {f.verification_status === 'Verified' && (
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gold text-[#0A0A0A] font-bold">
                ✓ Verified
              </span>
            )}
          </div>

          {/* Badges */}
          {venueBadges.length > 0 && (
            <div className="flex gap-2">
              {venueBadges.map((b) => (
                <span key={b.id} className="text-xs px-3 py-1.5 rounded-xl bg-[#1A1A1A] text-gold border border-gold/20">
                  {locale === 'zh' ? b.fields.name_zh : locale === 'ja' ? b.fields.name_ja : b.fields.name_en}
                </span>
              ))}
            </div>
          )}

          {desc && <p className="text-[#C4BFB3] leading-relaxed">{desc}</p>}

          {/* Links */}
          <div className="flex gap-4 text-sm">
            {f.website_url && <a href={f.website_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-[#E8C868] link-lift">🌐 Website</a>}
            {f.instagram && <a href={`https://instagram.com/${f.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-[#E8C868] link-lift">📸 Instagram</a>}
            {f.facebook_url && <a href={f.facebook_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-[#E8C868] link-lift">👤 Facebook</a>}
          </div>

          {f.address && <p className="text-sm text-[#8A8578]">📍 {f.address}</p>}
        </div>
      </div>

      </FadeUp>

      {/* Events */}
      <FadeUp stagger={0.12}>
      <section className="border-t border-[rgba(240,237,230,0.06)] pt-12">
        <h2 className="font-serif text-2xl font-bold mb-8">{t('events')} ({venueEvents.length})</h2>
        {venueEvents.length === 0 ? (
          <p className="text-[#8A8578]">{t('noEvents')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venueEvents.slice(0, 12).map((event) => {
              const tz = event.fields.timezone || 'Asia/Taipei';
              const artist = resolveLinks(event.fields.primary_artist, artists)[0];
              return (
                <Link key={event.id} href={`/${locale}/events/${event.id}`} className="block bg-[#111111] p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover group">
                  {event.fields.poster_url && (
                    <div className="h-36 overflow-hidden mb-4 -mx-5 -mt-5 rounded-t-2xl">
                      <img src={event.fields.poster_url} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" loading="lazy" />
                    </div>
                  )}
                  <div className="text-xs uppercase tracking-widest text-gold mb-2">
                    {formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                  </div>
                  <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300">
                    {event.fields.title || event.fields.title_local || 'Event'}
                  </h3>
                  {artist && <p className="text-xs text-[#8A8578] mt-1">♪ {displayName(artist.fields)}</p>}
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
