export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { getVenues, getEvents, getArtists, getBadges, getCities, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, formatTime, photoUrl, localized, cityName } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import SocialIcons from '@/components/SocialIcons';
import CollapsibleSection from '@/components/CollapsibleSection';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const [venues, cities] = await Promise.all([getVenues(), getCities()]);
  const venue = venues.find((v) => v.id === slug);
  if (!venue) return { title: 'Venue' };
  const f = venue.fields;
  const name = displayName(f);
  const city = f.city_id?.[0] ? cities.find((c) => c.id === f.city_id![0]) : null;
  const cityLabel = city ? cityName(city.fields, locale) : '';
  const desc = localized(f as Record<string, unknown>, 'description', locale);
  const description = desc || (cityLabel ? `${name} — ${cityLabel}` : name);
  const photo = photoUrl(f.photo_url, f.photo_file);
  return {
    title: name,
    description,
    ...(photo && { openGraph: { images: [{ url: photo }] } }),
  };
}

export default async function VenueDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');
  const tInst = await getTranslations('instruments');
  const instLabel = (key: string) => { try { return tInst(key as never); } catch { return key; } };

  const [venues, events, artists, badges, cities] = await Promise.all([getVenues(), getEvents(), getArtists(), getBadges(), getCities()]);
  const cityMap = new Map(cities.map((c) => [c.id, c.fields]));
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
        {t('backToList')}
      </Link>

      {/* Hero */}
      <FadeUp>
      <div className="flex flex-col lg:flex-row gap-10">
        {photoUrl(f.photo_url, f.photo_file) ? (
          <div className="w-full lg:w-[400px] shrink-0 overflow-hidden rounded-2xl">
            <Image src={photoUrl(f.photo_url, f.photo_file)!} alt={displayName(f)} width={800} height={600} className="w-full h-auto object-cover" sizes="(min-width: 1024px) 400px, 100vw" />
          </div>
        ) : (
          <div className="w-full lg:w-[400px] h-[260px] shrink-0 rounded-2xl bg-[var(--card)] flex items-center justify-center text-6xl border border-[var(--border)]">
            🎵
          </div>
        )}

        <div className="flex-1 space-y-6">
          <h1 className="font-serif text-4xl sm:text-5xl font-bold">{displayName(f)}</h1>
          {f.name_en && f.name_local && f.name_en !== f.name_local && (
            <p className="text-xl text-[#8A8578]">{f.name_en}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {f.city_id?.[0] && cityMap.get(f.city_id[0]) && (
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                📍 {cityName(cityMap.get(f.city_id[0])!, locale)}
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

          
          {/* Vibe Check / Practical Info */}
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-widest text-[#8A8578]">
            {f.payment_method && <span className="px-3 py-1.5 rounded-xl border border-[var(--border)]">💳 {f.payment_method}</span>}
            {f.friendly_zh && <span className="px-3 py-1.5 rounded-xl border border-[var(--border)]">🇹🇼 中文友善</span>}
            {f.friendly_en && <span className="px-3 py-1.5 rounded-xl border border-[var(--border)]">🇬🇧 英文友善</span>}
            {f.friendly_ja && <span className="px-3 py-1.5 rounded-xl border border-[var(--border)]">🇯🇵 日文友善</span>}
          </div>

{/* Badges */}
          {venueBadges.length > 0 && (
            <div className="flex gap-2">
              {venueBadges.map((b) => (
                <span key={b.id} className="text-xs px-3 py-1.5 rounded-xl bg-[#1A1A1A] text-gold border border-gold/20">
                  {locale === 'zh' ? b.fields.name_zh : locale === 'ja' ? b.fields.name_ja : locale === 'ko' ? b.fields.name_ko : b.fields.name_en}
                </span>
              ))}
            </div>
          )}

          {desc && <p className="text-[#C4BFB3] leading-relaxed">{desc}</p>}

          {/* Links */}
          <SocialIcons
            websiteUrl={f.website_url}
            instagram={f.instagram}
            facebookUrl={f.facebook_url}
          />

        </div>
      </div>

      </FadeUp>

      
      {/* Location & Map */}
      {((f.lat && f.lng) || f.address) && (
        <FadeUp stagger={0.1}>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8">📍 Location & Map</h2>
            {f.address && (
              <p className="text-sm text-[#C4BFB3] mb-6">{f.address}</p>
            )}
            {f.lat && f.lng && (
              <div className="rounded-2xl overflow-hidden border border-[var(--border)] h-[250px] sm:h-[350px] relative bg-[#1A1A1A]">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: "grayscale(100%) invert(92%) contrast(83%) opacity(80%)" }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${f.lat},${f.lng}`}
                ></iframe>
                {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]">
                    <a href={`https://maps.apple.com/?ll=${f.lat},${f.lng}&q=${encodeURIComponent(f.name_local || f.name_en || 'Venue')}`} target="_blank" rel="noreferrer" className="px-6 py-3 rounded-xl border border-gold/30 text-gold hover:bg-gold/10 transition-colors">
                      Open in Apple Maps
                    </a>
                  </div>
                )}
              </div>
            )}
          </section>
        </FadeUp>
      )}

{/* Most Frequent Performers */}
      {(() => {
        const topPerformers = resolveLinks(f.most_frequent_performers, artists);
        if (topPerformers.length === 0) return null;
        return (
          <FadeUp stagger={0.08}>
            <section className="border-t border-[var(--border)] pt-12">
              <h2 className="font-serif text-2xl font-bold mb-8">{t('topPerformers') || '常駐樂手'}</h2>
              <div className="flex flex-wrap gap-3">
                {topPerformers.map((a) => (
                  <Link key={a.id} href={`/${locale}/artists/${a.id}`}
                    className="flex items-center gap-3 bg-[var(--card)] px-4 py-3 rounded-xl border border-[var(--border)] card-hover group">
                    {photoUrl(a.fields.photo_url, a.fields.photo_file) && (
                      <Image src={photoUrl(a.fields.photo_url, a.fields.photo_file)!} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                    )}
                    <div>
                      <span className="text-sm font-medium group-hover:text-gold transition-colors">{displayName(a.fields)}</span>
                      {a.fields.primary_instrument && (
                        <span className="text-xs text-[#8A8578] ml-2">{instLabel(a.fields.primary_instrument)}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </FadeUp>
        );
      })()}

      
      {/* Jam Sessions */}
      {(() => {
        const jams = venueEvents.filter(e => e.fields.subtype === 'open_jam');
        if (jams.length === 0) return null;
        return (
          <FadeUp stagger={0.1}>
            <section className="border-t border-[var(--border)] pt-12">
              <h2 className="font-serif text-2xl font-bold mb-8">🎙️ Jam Sessions</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {jams.slice(0, 3).map((event) => {
                  const tz = event.fields.timezone || 'Asia/Taipei';
                  const artist = resolveLinks(event.fields.primary_artist, artists)[0];
                  return (
                    <Link key={event.id} href={`/${locale}/events/${event.id}`} className="block bg-[var(--card)] p-5 rounded-2xl border border-gold/30 card-hover group">
                      <div className="text-xs uppercase tracking-widest text-gold mb-2">
                        {formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                      </div>
                      <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300">
                        {event.fields.title || event.fields.title_local || 'Event'}
                      </h3>
                      {artist && <p className="text-xs text-[#8A8578] mt-1">Host: {displayName(artist.fields)}</p>}
                    </Link>
                  );
                })}
              </div>
            </section>
          </FadeUp>
        );
      })()}

{/* Upcoming Events */}
      {(() => {
        const now = new Date().toISOString();
        const upcomingEvents = venueEvents
          .filter((e) => e.fields.lifecycle_status === 'upcoming' || (!e.fields.lifecycle_status && (e.fields.start_at || '') >= now))
          .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));
        const pastEvents = venueEvents
          .filter((e) => e.fields.lifecycle_status === 'past' || (e.fields.lifecycle_status !== 'upcoming' && (e.fields.start_at || '') < now));

        return (
          <>
            <FadeUp stagger={0.12}>
              <section className="border-t border-[var(--border)] pt-12">
                <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
                  <span className="pulse-dot" />
                  {t('upcomingGigs')}
                </h2>
                {upcomingEvents.length === 0 ? (
                  <p className="text-[#8A8578]">{t('noEvents')}</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingEvents.slice(0, 6).map((event) => {
                      const tz = event.fields.timezone || 'Asia/Taipei';
                      const artist = resolveLinks(event.fields.primary_artist, artists)[0];
                      return (
                        <Link key={event.id} href={`/${locale}/events/${event.id}`} className="block bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] card-hover group">
                          {event.fields.poster_url && (
                            <div className="h-36 overflow-hidden mb-4 -mx-5 -mt-5 rounded-t-2xl relative">
                              <Image src={event.fields.poster_url} alt="" fill className="object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
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

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <FadeUp>
                <section className={upcomingEvents.length === 0 ? 'border-t border-[var(--border)] pt-12' : ''}>
                  <CollapsibleSection
                    title={t('pastHighlights')}
                    count={pastEvents.length}
                    countLabel={t('gigsCount')}
                  >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {pastEvents.slice(0, 12).map((event) => {
                        const tz = event.fields.timezone || 'Asia/Taipei';
                        const artist = resolveLinks(event.fields.primary_artist, artists)[0];
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
                            {artist && <p className="text-xs text-[#8A8578]/60 mt-0.5">♪ {displayName(artist.fields)}</p>}
                          </Link>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                </section>
              </FadeUp>
            )}
          </>
        );
      })()}
    </div>
  );
}
