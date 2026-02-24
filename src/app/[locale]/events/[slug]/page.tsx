export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getEvents, getVenues, getArtists, getLineups, getBadges, resolveLinks, type Event, type Venue, type Artist } from '@/lib/airtable';
import { displayName, formatDate, formatTime, photoUrl, localized, deriveCity, formatPriceBadge } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import EventNav from '@/components/EventNav';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const events = await getEvents();
  const event = events.find((e) => e.id === slug);
  const title = event?.fields.title || event?.fields.title_local || 'Event';
  return { title };
}

export default async function EventDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');
  const tInst = await getTranslations('instruments');
  const instLabel = (key: string) => { try { return tInst(key as never); } catch { return key; } };

  const [events, venues, artists, lineups, badges] = await Promise.all([
    getEvents(), getVenues(), getArtists(), getLineups(), getBadges(),
  ]);
  const event = events.find((e) => e.id === slug);

  if (!event) {
    return (
      <div className="py-24 text-center">
        <p className="text-[#8A8578]">Event not found.</p>
        <Link href={`/${locale}/events`} className="text-gold mt-4 inline-block link-lift">← Back to events</Link>
      </div>
    );
  }

  const f = event.fields;
  const tz = f.timezone || 'Asia/Taipei';
  const venue = resolveLinks(f.venue_id, venues)[0];

  // Compute prev/next events — same venue only, chronological
  const venueEventIds = new Set(venue?.fields.event_list || []);
  const venueSorted = [...events]
    .filter((e) => e.fields.start_at && venueEventIds.has(e.id))
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));
  const currentIdx = venueSorted.findIndex((e) => e.id === event.id);
  const prevEvent = currentIdx > 0 ? venueSorted[currentIdx - 1] : null;
  const nextEvent = currentIdx >= 0 && currentIdx < venueSorted.length - 1 ? venueSorted[currentIdx + 1] : null;
  const primaryArtist = resolveLinks(f.primary_artist, artists)[0];
  const desc = localized(f as Record<string, unknown>, 'description', locale);
  const descShort = localized(f as Record<string, unknown>, 'description_short', locale);

  // Get lineup for this event
  const eventLineups = lineups
    .filter((l) => l.fields.event_id?.some((eid) => eid === event.id))
    .sort((a, b) => (a.fields.order || 99) - (b.fields.order || 99));
  const lineupArtists = eventLineups
    .map((l) => {
      const artist = resolveLinks(l.fields.artist_id, artists)[0];
      return artist ? { artist, instruments: l.fields.instrument_list || [], role: l.fields.role } : null;
    })
    .filter(Boolean) as { artist: { id: string; fields: Artist }; instruments: string[]; role?: string }[];

  return (
    <div className="space-y-12">
      {/* Back link */}
      <Link href={`/${locale}/events`} className="text-sm text-[#8A8578] hover:text-gold transition-colors link-lift">
        {t('backToList')}
      </Link>

      {/* Hero section */}
      <FadeUp>
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Poster — only on detail page */}
        {f.poster_url && (
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="overflow-hidden rounded-2xl">
              <img src={f.poster_url} alt={f.title || ''} className="w-full h-auto object-cover" />
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 space-y-6">
          {/* Title */}
          <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-tight">
            {f.title || f.title_local || f.title_en || 'Untitled Event'}
          </h1>

          {/* Primary artist */}
          {primaryArtist && (
            <Link href={`/${locale}/artists/${primaryArtist.id}`} className="inline-flex items-center gap-2 text-lg text-[#8A8578] hover:text-gold transition-colors link-lift">
              <span className="text-gold">♪</span> {displayName(primaryArtist.fields)}
              {primaryArtist.fields.type && primaryArtist.fields.type !== 'person' && (
                <span className="text-sm capitalize">· {primaryArtist.fields.type}</span>
              )}
            </Link>
          )}

          {/* Price badge */}
          {(f.min_price != null || f.price_info) && (
            <span className="inline-block text-sm text-[#F0EDE6] bg-[#1A1A1A] px-4 py-2 rounded-xl border border-[rgba(240,237,230,0.08)] ml-4">
              {formatPriceBadge(f.currency, f.min_price, f.max_price, f.price_info)}
            </span>
          )}

          {/* ─── Event Details Block ─── */}
          <div className="bg-[#111111] rounded-2xl p-5 border border-[rgba(240,237,230,0.06)] space-y-3 text-sm mt-4">
            {/* City */}
            {venue && deriveCity(venue.fields.address_local || venue.fields.address_en) && (
              <div className="flex gap-3">
                <span className="text-[#8A8578] w-20 shrink-0">{t('eventCity')}</span>
                <span className="text-[#F0EDE6]">{deriveCity(venue.fields.address_local || venue.fields.address_en)}</span>
              </div>
            )}
            <div className="flex gap-3">
              <span className="text-[#8A8578] w-20 shrink-0">{t('eventDate')}</span>
              <span className="text-[#F0EDE6]">{formatDate(f.start_at, locale, tz)}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#8A8578] w-20 shrink-0">{t('eventTime')}</span>
              <span className="text-[#F0EDE6]">
                {formatTime(f.start_at, tz)}
                {f.end_at && ` — ${formatTime(f.end_at, tz)}`}
              </span>
            </div>
            {venue && (
              <div className="flex gap-3">
                <span className="text-[#8A8578] w-20 shrink-0">{t('eventVenue')}</span>
                <Link href={`/${locale}/venues/${venue.id}`} className="text-gold hover:text-[#E8C868] transition-colors link-lift">
                  {displayName(venue.fields)}
                </Link>
              </div>
            )}
            {(venue?.fields.address_local || venue?.fields.address_en) && (
              <div className="flex gap-3">
                <span className="text-[#8A8578] w-20 shrink-0">{t('eventAddress')}</span>
                <span className="text-[#C4BFB3]">{venue.fields.address_local || venue.fields.address_en}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {(descShort || desc) && (
            <div className="border-t border-[rgba(240,237,230,0.06)] pt-6">
              <p className="text-[#C4BFB3] leading-relaxed whitespace-pre-line">
                {descShort || desc}
              </p>
            </div>
          )}

          {/* Ticket button — below description */}
          {f.ticket_url && (
            <a href={f.ticket_url} target="_blank" rel="noopener noreferrer"
              className="btn-magnetic inline-flex items-center gap-2 bg-gold text-[#0A0A0A] px-6 py-3 text-sm font-bold uppercase tracking-widest">
              <span>{t('ticketLink')} ↗</span>
            </a>
          )}
        </div>
      </div>
      </FadeUp>

      {/* ─── Lineup ─── */}
      {lineupArtists.length > 0 && (
        <FadeUp>
        <section className="border-t border-[rgba(240,237,230,0.06)] pt-12">
          <h2 className="font-serif text-2xl font-bold mb-8">{t('lineup')}</h2>
          <div className="space-y-6">
            {lineupArtists.map(({ artist, instruments, role }) => {
              const bioShort = localized(artist.fields as Record<string, unknown>, 'bio_short', locale);
              return (
                <Link key={artist.id} href={`/${locale}/artists/${artist.id}`} className="block bg-[#111111] p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover group">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-serif text-lg font-bold group-hover:text-gold transition-colors duration-300">
                        {displayName(artist.fields)}
                      </h3>
                      <p className="text-xs uppercase tracking-widest text-gold mt-1">
                        {instruments.length > 0 ? instruments.map(i => instLabel(i)).join(', ') : role || (artist.fields.primary_instrument ? instLabel(artist.fields.primary_instrument) : '')}
                      </p>
                      {bioShort && (
                        <p className="text-xs text-[#8A8578] mt-3 leading-relaxed line-clamp-3">
                          {bioShort}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        </FadeUp>
      )}

      {/* ─── Prev / Next Navigation ─── */}
      <EventNav
        prevHref={prevEvent ? `/${locale}/events/${prevEvent.id}` : null}
        prevTitle={prevEvent ? (prevEvent.fields.title || prevEvent.fields.title_local || 'Event') : null}
        nextHref={nextEvent ? `/${locale}/events/${nextEvent.id}` : null}
        nextTitle={nextEvent ? (nextEvent.fields.title || nextEvent.fields.title_local || 'Event') : null}
        prevLabel={t('prevEvent')}
        nextLabel={t('nextEvent')}
      />

      {/* ─── Same city, other venues ─── */}
      {venue && (() => {
        const currentCityId = venue.fields.city_id?.[0];
        if (!currentCityId) return null;
        // Find other venues in same city
        const otherVenueIds = new Set(
          venues
            .filter((v) => v.id !== venue.id && v.fields.city_id?.[0] === currentCityId)
            .map((v) => v.id)
        );
        if (otherVenueIds.size === 0) return null;
        const now = new Date().toISOString();
        const sameCityEvents = events
          .filter((e) => {
            const eVenue = resolveLinks(e.fields.venue_id, venues)[0];
            return eVenue && otherVenueIds.has(eVenue.id) && e.fields.start_at && e.fields.start_at >= now;
          })
          .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
          .slice(0, 6);
        if (sameCityEvents.length === 0) return null;
        return (
          <FadeUp>
          <section className="border-t border-[rgba(240,237,230,0.06)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8">
              {t('sameCityEvents')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sameCityEvents.map((related) => {
                const rtz = related.fields.timezone || 'Asia/Taipei';
                const rVenue = resolveLinks(related.fields.venue_id, venues)[0];
                return (
                  <Link key={related.id} href={`/${locale}/events/${related.id}`} className="block bg-[#111111] p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover group">
                    <div className="text-xs uppercase tracking-widest text-gold mb-2">
                      {formatDate(related.fields.start_at, locale, rtz)} · {formatTime(related.fields.start_at, rtz)}
                    </div>
                    <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
                      {related.fields.title || related.fields.title_local || 'Event'}
                    </h3>
                    {rVenue && (
                      <p className="text-xs text-[#8A8578] mt-2">↗ {displayName(rVenue.fields)}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
          </FadeUp>
        );
      })()}
    </div>
  );
}
