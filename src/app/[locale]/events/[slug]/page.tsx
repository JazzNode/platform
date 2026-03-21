export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getEvents, getVenues, getArtists, getLineups, resolveLinks, buildMap, type Artist } from '@/lib/supabase';
import { displayName, artistDisplayName, eventTitle, eventSubtitle, formatDate, formatTime, photoUrl, localized, deriveCity, formatPriceBadge, normalizeInstrumentKey } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import RecordNav from '@/components/RecordNav';
import BookmarkButton from '@/components/BookmarkButton';
import FavoriteHighlight from '@/components/FavoriteHighlight';
import EditableContent from '@/components/EditableContent';
import EditableName from '@/components/EditableName';
import EventPosterUpload from '@/components/EventPosterUpload';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const events = await getEvents();
  const event = events.find((e) => e.id === slug);
  const title = event ? eventTitle(event.fields, locale) : 'Event';
  const desc = event ? (localized(event.fields as Record<string, unknown>, 'description', locale) || localized(event.fields as Record<string, unknown>, 'description_short', locale) || '') : '';
  // Build dynamic OG image
  const ogParams = new URLSearchParams({ title });
  if (event) {
    const venues = await getVenues();
    const v = venues.find((v) => v.id === event.fields.venue_id?.[0]);
    if (v) ogParams.set('venue', v.fields.display_name || v.fields.name_en || v.fields.name_local || '');
    if (event.fields.start_at) {
      const d = new Date(event.fields.start_at);
      ogParams.set('date', d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: event.fields.timezone || 'Asia/Taipei' }));
    }
    if (event.fields.poster_url) ogParams.set('poster', event.fields.poster_url);
  }
  const ogUrl = `/api/og/event?${ogParams.toString()}`;
  return {
    title,
    ...(desc && { description: desc.slice(0, 160) }),
    openGraph: { images: [{ url: ogUrl, width: 1200, height: 630 }] },
    alternates: {
      canonical: `/${locale}/events/${slug}`,
      languages: {
        'x-default': `/en/events/${slug}`,
        en: `/en/events/${slug}`,
        'zh-Hant': `/zh/events/${slug}`,
        ja: `/ja/events/${slug}`,
        ko: `/ko/events/${slug}`,
        th: `/th/events/${slug}`,
        id: `/id/events/${slug}`,
      },
    },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');
  const tInst = await getTranslations('instruments');
  const instLabel = (key: string) => { const k = normalizeInstrumentKey(key); try { return tInst(k as never); } catch { return k; } };

  const [events, venues, artists, lineups] = await Promise.all([
    getEvents(), getVenues(), getArtists(), getLineups(),
  ]);
  const event = events.find((e) => e.id === slug);

  if (!event) {
    notFound();
  }

  const f = event.fields;
  const tz = f.timezone || 'Asia/Taipei';
  const venueMap = buildMap(venues);
  const artistMap = buildMap(artists);
  const venue = resolveLinks(f.venue_id, venueMap)[0];

  // Compute prev/next events — same venue only, chronological
  const venueEventIds = new Set(venue?.fields.event_list || []);
  const venueSorted = [...events]
    .filter((e) => e.fields.start_at && venueEventIds.has(e.id))
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));
  const currentIdx = venueSorted.findIndex((e) => e.id === event.id);
  const prevEvent = currentIdx > 0 ? venueSorted[currentIdx - 1] : null;
  const nextEvent = currentIdx >= 0 && currentIdx < venueSorted.length - 1 ? venueSorted[currentIdx + 1] : null;
  const primaryArtist = resolveLinks(f.primary_artist, artistMap)[0];
  const desc = localized(f as Record<string, unknown>, 'description', locale);
  const descShort = localized(f as Record<string, unknown>, 'description_short', locale);

  // Get lineup for this event
  const eventLineups = lineups
    .filter((l) => l.fields.event_id?.some((eid) => eid === event.id))
    .sort((a, b) => (a.fields.order || 99) - (b.fields.order || 99));
  const lineupArtistsRaw = eventLineups
    .map((l) => {
      const artist = resolveLinks(l.fields.artist_id, artistMap)[0];
      return artist ? { artist, instruments: l.fields.instrument_list || [], role: l.fields.role } : null;
    })
    .filter(Boolean) as { artist: { id: string; fields: Artist }; instruments: string[]; role?: string }[];

  // Deduplicate: if the same artist appears multiple times, keep the first (ensemble has order=-1 so it wins)
  const seen = new Set<string>();
  const lineupArtistsDeduped = lineupArtistsRaw.filter((l) => {
    if (seen.has(l.artist.id)) return false;
    seen.add(l.artist.id);
    return true;
  });

  // If the primary artist is a group/big band and has no ensemble lineup yet, inject it at the top
  const hasEnsembleLineup = lineupArtistsDeduped.some((l) => l.role === 'ensemble');
  const isGroupPrimary = primaryArtist && (primaryArtist.fields.type === 'group' || primaryArtist.fields.type === 'big band');
  const lineupArtists = (!hasEnsembleLineup && isGroupPrimary)
    ? [{ artist: primaryArtist, instruments: [], role: 'ensemble' as string | undefined }, ...lineupArtistsDeduped]
    : lineupArtistsDeduped;

  // ─── JSON-LD structured data (schema.org/Event) ───
  const localeToInLanguage: Record<string, string> = {
    en: 'en', zh: 'zh-Hant', ja: 'ja', ko: 'ko', th: 'th', id: 'id',
  };
  const eventStatus = f.lifecycle_status === 'cancelled'
    ? 'https://schema.org/EventCancelled'
    : f.lifecycle_status === 'postponed'
      ? 'https://schema.org/EventPostponed'
      : 'https://schema.org/EventScheduled';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: eventTitle(f, locale),
    ...(f.start_at && { startDate: f.start_at }),
    ...(f.end_at && { endDate: f.end_at }),
    eventStatus,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(desc && { description: desc }),
    ...(f.poster_url && { image: f.poster_url }),
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com'}/${locale}/events/${slug}`,
    ...(f.source_url && { sameAs: f.source_url }),
    ...(localeToInLanguage[locale] && { inLanguage: localeToInLanguage[locale] }),
    ...(venue && {
      location: {
        '@type': 'MusicVenue',
        name: displayName(venue.fields),
        ...((venue.fields.address_local || venue.fields.address_en) && {
          address: {
            '@type': 'PostalAddress',
            ...(venue.fields.address_en && { streetAddress: venue.fields.address_en }),
          },
        }),
        ...((venue.fields.lat && venue.fields.lng) && {
          geo: { '@type': 'GeoCoordinates', latitude: venue.fields.lat, longitude: venue.fields.lng },
        }),
      },
    }),
    ...(lineupArtists.length > 0 && {
      performer: lineupArtists.map(({ artist }) => ({
        '@type': artist.fields.type === 'group' || artist.fields.type === 'big band'
          ? 'MusicGroup' : 'Person',
        name: artistDisplayName(artist.fields, locale),
      })),
    }),
    ...(f.price_info != null && {
      offers: {
        '@type': 'Offer',
        ...(venue?.fields.currency && { priceCurrency: venue.fields.currency }),
        price: f.price_info,
        availability: 'https://schema.org/InStock',
        ...(f.source_url && { url: f.source_url }),
      },
    }),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'JazzNode', item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com'}/${locale}` },
      { '@type': 'ListItem', position: 2, name: t('events'), item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com'}/${locale}/events` },
      { '@type': 'ListItem', position: 3, name: eventTitle(f, locale) },
    ],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {/* Back link */}
      <Link href={`/${locale}/events`} className="mb-8 inline-block text-sm text-[var(--muted-foreground)] hover:text-gold transition-colors link-lift">
        {t('backToList')}
      </Link>

      <FavoriteHighlight itemType="event" itemId={event.id}>
      <div className="space-y-12">
      {/* Hero section */}
      <FadeUp>
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Poster — only on detail page (admin can upload/change) */}
        <EventPosterUpload
          eventId={event.id}
          eventTitle={eventTitle(f, locale)}
          currentPosterUrl={f.poster_url || null}
        />

        {/* Info */}
        <div className="flex-1 space-y-6">
          {/* Title */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <EditableName
                entityType="event"
                entityId={event.id}
                field={f.title_local ? 'title_local' : 'title_en'}
                value={f.title_local || f.title_en || 'Untitled Event'}
                fieldOptions={[
                  { field: 'title_local', label: 'title_local', value: f.title_local || '' },
                  { field: 'title_en', label: 'title_en', value: f.title_en || '' },
                ]}
                className="font-serif text-4xl sm:text-5xl font-bold leading-tight"
                tag="h1"
              />
              {eventSubtitle(f) && (
                <EditableName
                  entityType="event"
                  entityId={event.id}
                  field="title_en"
                  value={eventSubtitle(f)!}
                  fieldOptions={[
                    { field: 'title_local', label: 'title_local', value: f.title_local || '' },
                    { field: 'title_en', label: 'title_en', value: f.title_en || '' },
                  ]}
                  className="text-xl text-[var(--muted-foreground)]"
                  tag="p"
                />
              )}
            </div>
            <BookmarkButton itemId={event.id} variant="full" />
          </div>

          {/* Primary artist */}
          {primaryArtist && (
            <Link href={`/${locale}/artists/${primaryArtist.id}`} className="inline-flex items-center gap-2 text-lg text-[var(--muted-foreground)] hover:text-gold transition-colors link-lift">
              <span className="text-gold">♪</span> {artistDisplayName(primaryArtist.fields, locale)}
              {primaryArtist.fields.type && primaryArtist.fields.type !== 'person' && (
                <span className="text-sm capitalize">· {primaryArtist.fields.type}</span>
              )}
            </Link>
          )}

          {/* Price badge */}
          {f.price_info && (
            <span className="inline-block text-sm text-[var(--foreground)] bg-[var(--card)] px-4 py-2 rounded-xl border border-[var(--border)] ml-4">
              {formatPriceBadge(venue?.fields.currency, f.price_info)}
            </span>
          )}

          {/* ─── Event Details Block ─── */}
          <div className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)] space-y-3 text-sm mt-4">
            {/* City */}
            {venue && deriveCity(venue.fields.address_local || venue.fields.address_en) && (
              <div className="flex gap-3">
                <span className="text-[var(--muted-foreground)] w-20 shrink-0">{t('eventCity')}</span>
                <span className="text-[var(--foreground)]">{deriveCity(venue.fields.address_local || venue.fields.address_en)}</span>
              </div>
            )}
            <div className="flex gap-3">
              <span className="text-[var(--muted-foreground)] w-20 shrink-0">{t('eventDate')}</span>
              <span className="text-[var(--foreground)]">{formatDate(f.start_at, locale, tz)}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[var(--muted-foreground)] w-20 shrink-0">{t('eventTime')}</span>
              <span className="text-[var(--foreground)]">
                {formatTime(f.start_at, tz)}
                {f.end_at && ` — ${formatTime(f.end_at, tz)}`}
              </span>
            </div>
            {venue && (
              <div className="flex gap-3">
                <span className="text-[var(--muted-foreground)] w-20 shrink-0">{t('eventVenue')}</span>
                <Link href={`/${locale}/venues/${venue.id}`} className="text-gold hover:text-gold-bright transition-colors link-lift">
                  {displayName(venue.fields)}
                </Link>
              </div>
            )}
            {(venue?.fields.address_local || venue?.fields.address_en) && (
              <div className="flex gap-3">
                <span className="text-[var(--muted-foreground)] w-20 shrink-0">{t('eventAddress')}</span>
                <span className="text-[#C4BFB3]">{venue.fields.address_local || venue.fields.address_en}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <EditableContent
            entityType="event"
            entityId={event.id}
            fieldPrefix="description"
            locale={locale}
            content={desc || descShort}
            contentClassName="text-[#C4BFB3] leading-relaxed whitespace-pre-line"
            wrapperClassName="border-t border-[var(--border)] pt-6"
          />

          {/* Ticket button — below description */}
          {f.source_url && (
            <a href={f.source_url} target="_blank" rel="noopener noreferrer"
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
        <section className="border-t border-[var(--border)] pt-12">
          <h2 className="font-serif text-2xl font-bold mb-8">{t('lineup')}</h2>
          <div className="space-y-6">
            {lineupArtists.map(({ artist, instruments, role }) => {
              const bioShort = localized(artist.fields as Record<string, unknown>, 'bio_short', locale);
              return (
                <Link key={artist.id} href={`/${locale}/artists/${artist.id}`} className="block bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] card-hover group">
                  <div className="flex items-center gap-4">
                    {/* Artist avatar */}
                    {photoUrl(artist.fields.photo_url) ? (
                      <Image
                        src={photoUrl(artist.fields.photo_url)!}
                        alt={artistDisplayName(artist.fields, locale)}
                        width={72} height={72}
                        className="w-18 h-18 rounded-xl object-cover shrink-0 border border-[var(--border)] group-hover:border-gold/40 transition-colors duration-300"
                        sizes="72px"
                      />
                    ) : (
                      <div className="w-18 h-18 rounded-xl bg-[var(--bg)] flex items-center justify-center text-xl shrink-0 border border-[var(--border)] group-hover:border-gold/40 transition-colors duration-300">
                        ♪
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-lg font-bold group-hover:text-gold transition-colors duration-300">
                        {artistDisplayName(artist.fields, locale)}
                      </h3>
                      <p className="text-xs uppercase tracking-widest text-gold mt-1">
                        {role === 'ensemble'
                          ? (artist.fields.type === 'big band' ? 'BIG BAND' : 'GROUP')
                          : instruments.length > 0 ? instruments.map(i => instLabel(i)).join(', ') : role || (artist.fields.primary_instrument ? instLabel(artist.fields.primary_instrument) : '')}
                      </p>
                      {bioShort && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-3 leading-relaxed line-clamp-3">
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
      <RecordNav
        prevHref={prevEvent ? `/${locale}/events/${prevEvent.id}` : null}
        prevTitle={prevEvent ? eventTitle(prevEvent.fields, locale) : null}
        nextHref={nextEvent ? `/${locale}/events/${nextEvent.id}` : null}
        nextTitle={nextEvent ? eventTitle(nextEvent.fields, locale) : null}
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
            const eVenue = resolveLinks(e.fields.venue_id, venueMap)[0];
            return eVenue && otherVenueIds.has(eVenue.id) && e.fields.start_at && e.fields.start_at >= now;
          })
          .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
          .slice(0, 6);
        if (sameCityEvents.length === 0) return null;
        return (
          <FadeUp>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8">
              {t('sameCityEvents')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sameCityEvents.map((related) => {
                const rtz = related.fields.timezone || 'Asia/Taipei';
                const rVenue = resolveLinks(related.fields.venue_id, venueMap)[0];
                return (
                  <Link key={related.id} href={`/${locale}/events/${related.id}`} className="block bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] card-hover group">
                    <div className="text-xs uppercase tracking-widest text-gold mb-2">
                      {formatDate(related.fields.start_at, locale, rtz)} · {formatTime(related.fields.start_at, rtz)}
                    </div>
                    <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
                      {eventTitle(related.fields, locale)}
                    </h3>
                    {rVenue && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-2">↗ {displayName(rVenue.fields)}</p>
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
      </FavoriteHighlight>
    </div>
  );
}
