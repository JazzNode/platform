export const revalidate = 300;
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getEvents, getVenues, getArtists, getLineups, getCities, resolveLinks, buildMap, type Artist } from '@/lib/supabase';
import { displayName, artistDisplayName, eventTitle, eventSubtitle, formatDate, formatTime, photoUrl, localized, formatPriceBadge, normalizeInstrumentKey, relativeEventDate, isEventLive } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import RecordNav from '@/components/RecordNav';
import BookmarkButton from '@/components/BookmarkButton';
import FavoriteHighlight from '@/components/FavoriteHighlight';
import EditableContent from '@/components/EditableContent';
import EditableName from '@/components/EditableName';
import EventPosterUpload from '@/components/EventPosterUpload';
import AddToCalendar from '@/components/AddToCalendar';
import ShareButton from '@/components/ShareButton';
import PriceInfo from '@/components/PriceInfo';
import { createClient as createServerSupabase } from '@/utils/supabase/server';

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
    openGraph: {
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      ...(desc && { description: desc.slice(0, 160) }),
    },
    twitter: { card: 'summary_large_image' },
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

  const [events, venues, artists, lineups, cities] = await Promise.all([
    getEvents(), getVenues(), getArtists(), getLineups(), getCities(),
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

  // Resolve city name from venue's city_id (reliable across all locales/countries)
  const cityName = (() => {
    const cityId = venue?.fields.city_id?.[0];
    if (!cityId) return undefined;
    const city = cities.find((c) => c.id === cityId);
    if (!city) return undefined;
    const localeKey = `name_${locale}` as keyof typeof city.fields;
    return (city.fields[localeKey] as string) || city.fields.name_local || city.fields.name_en;
  })();

  // Fetch bookmark (want-to-go) count
  let bookmarkCount = 0;
  try {
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', 'event')
      .eq('target_id', event.id);
    bookmarkCount = count ?? 0;
  } catch { /* ignore — count is non-critical */ }

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
    offers: {
      '@type': 'Offer',
      ...(venue?.fields.currency && { priceCurrency: venue.fields.currency }),
      // Google requires price as a number; extract digits from price_info string (e.g. "¥3000" → 3000)
      price: f.price_info ? Number(f.price_info.replace(/[^\d.]/g, '')) || 0 : 0,
      availability: f.lifecycle_status === 'cancelled'
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      ...(f.source_url && { url: f.source_url }),
      // validFrom: when the event record was created (proxy for ticket availability start)
      ...(f.created_at && { validFrom: f.created_at }),
    },
    // organizer: use venue as the organizing entity
    ...(venue && {
      organizer: {
        '@type': 'Organization',
        name: displayName(venue.fields),
        ...(venue.fields.website_url && { url: venue.fields.website_url }),
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

  // ─── Price: short for glance, full for details ───
  const priceFull = formatPriceBadge(venue?.fields.currency, f.price_info) || null;
  const priceShort = (() => {
    if (!priceFull) return null;
    // Try to extract "NT$500" / "¥3000" / "$20" / "Free" etc. from longer strings
    const match = priceFull.match(/^((?:NT\$|¥|US?\$|S\$|RM|HK\$|฿|Rp\.?\s?|₩)?\s?[\d,]+(?:\.\d+)?|Free|免費|無料|무료|ฟรี|Gratis)/i);
    return match ? match[0] : priceFull.slice(0, 30) + (priceFull.length > 30 ? '…' : '');
  })();

  // ─── Relative date for visitor-friendly display ───
  const relDate = relativeEventDate(f.start_at, locale, tz);
  const mapsDirectionsUrl = venue?.fields.lat && venue?.fields.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${venue.fields.lat},${venue.fields.lng}`
    : null;
  const mapsSearchUrl = venue?.fields.lat && venue?.fields.lng
    ? (venue.fields.place_id
        ? `https://www.google.com/maps/place/?q=place_id:${venue.fields.place_id}`
        : `https://www.google.com/maps/search/?api=1&query=${venue.fields.lat},${venue.fields.lng}`)
    : null;
  const appleMapsUrl = venue?.fields.lat && venue?.fields.lng
    ? `https://maps.apple.com/?ll=${venue.fields.lat},${venue.fields.lng}&q=${encodeURIComponent(displayName(venue?.fields || {}))}`
    : null;

  // ─── Same city events (computed once, used in both mobile & desktop) ───
  const sameCityEvents = venue ? (() => {
    const currentCityId = venue.fields.city_id?.[0];
    if (!currentCityId) return [];
    const otherVenueIds = new Set(
      venues
        .filter((v) => v.id !== venue.id && v.fields.city_id?.[0] === currentCityId)
        .map((v) => v.id)
    );
    if (otherVenueIds.size === 0) return [];
    const now = new Date().toISOString();
    return events
      .filter((e) => {
        const eVenue = resolveLinks(e.fields.venue_id, venueMap)[0];
        return eVenue && otherVenueIds.has(eVenue.id) && e.fields.start_at && e.fields.start_at >= now;
      })
      .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
      .slice(0, 6);
  })() : [];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <FavoriteHighlight itemType="event" itemId={event.id}>
      {/* Back link */}
      <Link href={`/${locale}/events`} className="mb-6 inline-block text-sm text-[var(--muted-foreground)] hover:text-gold transition-colors link-lift">
        {t('backToList')}
      </Link>

      <div className="space-y-10">

      {/* ═══════════════════════════════════════════════
          HERO — Mobile: compact horizontal / Desktop: side-by-side
         ═══════════════════════════════════════════════ */}
      <FadeUp>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

        {/* ── Left column: Poster + Quick facts (mobile: horizontal, desktop: poster full) ── */}
        <div className="lg:w-[420px] shrink-0">
          {/* Mobile: poster + key info side by side */}
          <div className="flex gap-4 lg:hidden">
            <EventPosterUpload
              eventId={event.id}
              eventTitle={eventTitle(f, locale)}
              currentPosterUrl={f.poster_url || null}
              className="!w-[130px] !min-h-[130px] !max-h-[180px] shrink-0"
            />
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
              {/* Relative date badge */}
              {relDate.label && (
                <div className={`inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                  isEventLive(f.start_at, f.end_at)
                    ? 'bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse'
                    : relDate.isTonight
                      ? 'bg-gold/15 border border-gold/40 text-gold'
                      : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'
                }`}>
                  {isEventLive(f.start_at, f.end_at) && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                  {isEventLive(f.start_at, f.end_at) ? t('happeningNow') : relDate.label}
                </div>
              )}
              {/* Time */}
              <p className="text-lg font-bold text-[var(--foreground)] inline-flex items-center gap-1.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted-foreground)] shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {formatTime(f.start_at, tz)}{f.end_at && ` — ${formatTime(f.end_at, tz)}`}
              </p>
              {/* Price */}
              {priceShort && priceFull && (
                <div className="inline-flex items-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted-foreground)] shrink-0"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <PriceInfo short={priceShort} full={priceFull} className="text-sm" />
                </div>
              )}
              {/* Venue name */}
              {venue && (
                <Link href={`/${locale}/venues/${venue.id}`} className="text-sm text-[var(--muted-foreground)] hover:text-gold transition-colors truncate inline-flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold shrink-0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z"/><circle cx="12" cy="9" r="2.5"/></svg>
                  {displayName(venue.fields)}
                </Link>
              )}
            </div>
          </div>

          {/* Desktop: full poster */}
          <div className="hidden lg:block">
            <EventPosterUpload
              eventId={event.id}
              eventTitle={eventTitle(f, locale)}
              currentPosterUrl={f.poster_url || null}
            />
          </div>
        </div>

        {/* ── Right column: Title, details, actions ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Desktop: relative date badge */}
          <div className="hidden lg:block">
            {relDate.label && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                isEventLive(f.start_at, f.end_at)
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse'
                  : relDate.isTonight
                    ? 'bg-gold/15 border border-gold/40 text-gold'
                    : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]'
              }`}>
                {isEventLive(f.start_at, f.end_at) && <span className="w-2 h-2 rounded-full bg-red-400" />}
                {isEventLive(f.start_at, f.end_at) ? t('happeningNow') : relDate.label}
              </div>
            )}
          </div>

          {/* Title + Bookmark */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <EditableName
                entityType="event"
                entityId={event.id}
                field={f.title_local ? 'title_local' : 'title_en'}
                value={f.title_local || f.title_en || 'Untitled Event'}
                fieldOptions={[
                  { field: 'title_local', label: 'title_local', value: f.title_local || '' },
                  { field: 'title_en', label: 'title_en', value: f.title_en || '' },
                ]}
                className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight"
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
                  className="text-base lg:text-lg text-[var(--muted-foreground)]"
                  tag="p"
                />
              )}
            </div>
          </div>

          {/* ─── Mobile: secondary actions below title ─── */}
          <div className="flex items-center justify-between lg:hidden [&_button]:!px-4 [&_button]:!py-2 [&_button]:!text-sm [&_button]:!tracking-wide [&_button]:!normal-case [&_button]:!font-medium">
            {f.start_at && (
              <AddToCalendar
                title={eventTitle(f, locale)}
                startAt={f.start_at}
                endAt={f.end_at}
                timezone={tz}
                venueName={venue ? displayName(venue.fields) : undefined}
                address={venue?.fields.address_local || venue?.fields.address_en || undefined}
                description={descShort || desc || undefined}
                sourceUrl={f.source_url}
                variant="full"
                label={t('addToCalendar')}
              />
            )}
            <ShareButton
              title={eventTitle(f, locale)}
              url={`/${locale}/events/${slug}`}
              text={[
                eventTitle(f, locale),
                `📅 ${f.start_at ? formatDate(f.start_at, locale, tz) : ''}${venue ? ` · 📍 ${displayName(venue.fields)}` : ''}`,
                'via JazzNode — The Jazz Scene, Connected.',
              ].filter(Boolean).join('\n')}
              variant="full"
              label={t('share')}
            />
            <BookmarkButton itemId={event.id} variant="full" />
          </div>

          {/* ─── Quick Facts (Desktop: horizontal badges) ─── */}
          <div className="hidden lg:flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-[var(--foreground)] whitespace-nowrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted-foreground)]"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {formatTime(f.start_at, tz)}{f.end_at && ` — ${formatTime(f.end_at, tz)}`}
            </span>
            {priceShort && priceFull && (
              <span className="inline-flex items-center gap-1.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted-foreground)]"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <PriceInfo short={priceShort} full={priceFull} />
              </span>
            )}
            {cityName && (
              <span className="text-[var(--muted-foreground)] whitespace-nowrap">
                {cityName}
              </span>
            )}
          </div>

          {/* ─── Venue + Address card (clickable address) ─── */}
          <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)]">
            <div>
              <div className="flex-1 min-w-0">
                {venue && (
                  <Link href={`/${locale}/venues/${venue.id}`} className="font-medium text-[var(--foreground)] hover:text-gold transition-colors">
                    {displayName(venue.fields)}
                  </Link>
                )}
                {(venue?.fields.address_local || venue?.fields.address_en) && (
                  <a
                    href={mapsSearchUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-[var(--muted-foreground)] hover:text-gold transition-colors mt-1"
                  >
                    {venue.fields.address_local || venue.fields.address_en}
                  </a>
                )}
                {/* Date row — visible on mobile (desktop shows in quick facts) */}
                <p className="text-sm text-[var(--muted-foreground)] mt-1 lg:hidden">
                  {formatDate(f.start_at, locale, tz)}
                </p>
              </div>
            </div>
          </div>

          {/* ─── Map preview (mobile: full width, desktop: hidden — shown in sidebar) ─── */}
          {venue?.fields.lat && venue?.fields.lng && (
            <div className="lg:hidden">
              <a
                href={mapsDirectionsUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl overflow-hidden border border-[var(--border)] h-[160px] relative bg-[#1A1A1A]"
              >
                {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0, filter: 'grayscale(100%) invert(92%) contrast(83%) opacity(80%)', pointerEvents: 'none' }}
                    loading="lazy"
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${venue.fields.lat},${venue.fields.lng}&zoom=15`}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[var(--muted-foreground)] text-sm">{t('openInMaps')}</span>
                  </div>
                )}
                {/* Tap overlay */}
                <div className="absolute inset-0" />
              </a>
            </div>
          )}

          {/* ─── Mobile CTAs ─── */}
          <div className="lg:hidden space-y-3">
            {mapsDirectionsUrl && (
              <a
                href={mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-bold uppercase tracking-widest rounded-xl bg-gold text-[#0A0A0A] hover:bg-gold-bright transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                {t('getDirections')}
              </a>
            )}
            {f.source_url && (
              <a href={f.source_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-bold uppercase tracking-widest rounded-xl border-2 border-gold text-gold hover:bg-gold/10 transition-colors">
                {t('ticketLink')} ↗
              </a>
            )}
          </div>

          {/* ─── Desktop: Ticket + secondary actions in one row ─── */}
          <div className="hidden lg:flex flex-wrap items-center gap-3">
            {f.source_url && (
              <a href={f.source_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gold text-[#0A0A0A] px-4 py-2.5 text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-gold-bright transition-colors btn-magnetic">
                <span>{t('ticketLink')} ↗</span>
              </a>
            )}
            <BookmarkButton itemId={event.id} variant="full" />
            <span className="w-px h-6 bg-[var(--border)]" />
            {f.start_at && (
              <AddToCalendar
                title={eventTitle(f, locale)}
                startAt={f.start_at}
                endAt={f.end_at}
                timezone={tz}
                venueName={venue ? displayName(venue.fields) : undefined}
                address={venue?.fields.address_local || venue?.fields.address_en || undefined}
                description={descShort || desc || undefined}
                sourceUrl={f.source_url}
                variant="full"
                label={t('addToCalendar')}
              />
            )}
            <ShareButton
              title={eventTitle(f, locale)}
              url={`/${locale}/events/${slug}`}
              text={[
                eventTitle(f, locale),
                `📅 ${f.start_at ? formatDate(f.start_at, locale, tz) : ''}${venue ? ` · 📍 ${displayName(venue.fields)}` : ''}`,
                'via JazzNode — The Jazz Scene, Connected.',
              ].filter(Boolean).join('\n')}
              variant="full"
              label={t('share')}
            />
            {mapsDirectionsUrl && (
              <a
                href={mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium uppercase tracking-widest rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-gold hover:border-gold/40 hover:bg-gold/5 transition-all duration-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <span>{t('getDirections')}</span>
              </a>
            )}
          </div>

        </div>
      </div>
      </FadeUp>

      {/* ═══════════════════════════════════════════════
          BODY — Mobile: linear / Desktop: two-column
         ═══════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row gap-10">

        {/* ── Main content column ── */}
        <div className="flex-1 min-w-0 space-y-10">

          {/* Description */}
          {(desc || descShort) && (
            <FadeUp>
            <section>
              <h2 className="font-serif text-xl font-bold mb-4">{t('aboutThisEvent')}</h2>
              <EditableContent
                entityType="event"
                entityId={event.id}
                fieldPrefix="description"
                locale={locale}
                content={desc || descShort}
                contentClassName="text-[#C4BFB3] leading-relaxed whitespace-pre-line"
              />
            </section>
            </FadeUp>
          )}

          {/* ─── Lineup ─── */}
          {lineupArtists.length > 0 && (
            <FadeUp>
            <section className="border-t border-[var(--border)] pt-10">
              <h2 className="font-serif text-xl font-bold mb-6">{t('lineup')}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {lineupArtists.map(({ artist, instruments, role }) => {
                  const bioShort = localized(artist.fields as Record<string, unknown>, 'bio_short', locale);
                  return (
                    <Link key={artist.id} href={`/${locale}/artists/${artist.id}`} className="block bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] card-hover group">
                      <div className="flex items-center gap-3">
                        {photoUrl(artist.fields.photo_url) ? (
                          <Image
                            src={photoUrl(artist.fields.photo_url)!}
                            alt={artistDisplayName(artist.fields, locale)}
                            width={56} height={56}
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[var(--border)] group-hover:border-gold/40 transition-colors duration-300"
                            sizes="56px"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-[var(--bg)] flex items-center justify-center text-lg shrink-0 border border-[var(--border)] group-hover:border-gold/40 transition-colors duration-300">
                            ♪
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300 truncate">
                            {artistDisplayName(artist.fields, locale)}
                          </h3>
                          <p className="text-xs uppercase tracking-widest text-gold mt-0.5">
                            {role === 'ensemble'
                              ? (artist.fields.type === 'big band' ? 'BIG BAND' : 'GROUP')
                              : instruments.length > 0 ? instruments.map(i => instLabel(i)).join(', ') : role || (artist.fields.primary_instrument ? instLabel(artist.fields.primary_instrument) : '')}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
            </FadeUp>
          )}

          {/* Prev / Next Navigation */}
          <RecordNav
            prevHref={prevEvent ? `/${locale}/events/${prevEvent.id}` : null}
            prevTitle={prevEvent ? eventTitle(prevEvent.fields, locale) : null}
            nextHref={nextEvent ? `/${locale}/events/${nextEvent.id}` : null}
            nextTitle={nextEvent ? eventTitle(nextEvent.fields, locale) : null}
            prevLabel={t('prevEvent')}
            nextLabel={t('nextEvent')}
          />

          {/* Same city events — mobile only (desktop shows in sidebar) */}
          {sameCityEvents.length > 0 && (
            <FadeUp>
            <section className="border-t border-[var(--border)] pt-10 lg:hidden">
              <h2 className="font-serif text-xl font-bold mb-6">{t('sameCityEvents')}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {sameCityEvents.map((related) => {
                  const rtz = related.fields.timezone || 'Asia/Taipei';
                  const rVenue = resolveLinks(related.fields.venue_id, venueMap)[0];
                  return (
                    <Link key={related.id} href={`/${locale}/events/${related.id}`} className="block bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] card-hover group">
                      <div className="text-xs uppercase tracking-widest text-gold mb-1.5">
                        {formatDate(related.fields.start_at, locale, rtz)} · {formatTime(related.fields.start_at, rtz)}
                      </div>
                      <h3 className="font-serif text-sm font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
                        {eventTitle(related.fields, locale)}
                      </h3>
                      {rVenue && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1.5">↗ {displayName(rVenue.fields)}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
            </FadeUp>
          )}
        </div>

        {/* ── Desktop sidebar ── */}
        <aside className="hidden lg:block lg:w-[340px] shrink-0 space-y-8">

          {/* Venue info card */}
          {venue && (
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 space-y-4">
              <h3 className="font-serif text-base font-bold">{t('eventVenue')}</h3>
              <Link href={`/${locale}/venues/${venue.id}`} className="block text-gold hover:text-gold-bright transition-colors font-medium">
                {displayName(venue.fields)}
              </Link>
              {(venue.fields.address_local || venue.fields.address_en) && (
                <a
                  href={mapsSearchUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-[var(--muted-foreground)] hover:text-gold transition-colors"
                >
                  {venue.fields.address_local || venue.fields.address_en}
                </a>
              )}
              {venue.fields.phone && (
                <a href={`tel:${venue.fields.phone}`} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-gold transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
                  {venue.fields.phone}
                </a>
              )}
              {venue.fields.website_url && (
                <a href={venue.fields.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-gold transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>
                  {venue.fields.website_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              )}
            </div>
          )}

          {/* Map — desktop sidebar */}
          {venue?.fields.lat && venue?.fields.lng && (
            <div className="rounded-2xl overflow-hidden border border-[var(--border)] h-[220px] relative bg-[#1A1A1A]">
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'grayscale(100%) invert(92%) contrast(83%) opacity(80%)' }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${venue.fields.lat},${venue.fields.lng}&zoom=15`}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <a href={appleMapsUrl || '#'} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-xl border border-gold/30 text-gold hover:bg-gold/10 transition-colors text-sm">
                    {t('openInMaps')}
                  </a>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 flex gap-2 p-2">
                {mapsSearchUrl && (
                  <a href={mapsSearchUrl} target="_blank" rel="noreferrer" className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--card)]/90 backdrop-blur border border-[var(--border)] text-[var(--muted-foreground)] hover:text-gold transition-colors">
                    Google Maps
                  </a>
                )}
                {appleMapsUrl && (
                  <a href={appleMapsUrl} target="_blank" rel="noreferrer" className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--card)]/90 backdrop-blur border border-[var(--border)] text-[var(--muted-foreground)] hover:text-gold transition-colors">
                    Apple Maps
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Same city events — desktop sidebar */}
          {sameCityEvents.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-serif text-base font-bold">{t('sameCityEvents')}</h3>
              <div className="space-y-3">
                {sameCityEvents.map((related) => {
                  const rtz = related.fields.timezone || 'Asia/Taipei';
                  const rVenue = resolveLinks(related.fields.venue_id, venueMap)[0];
                  const rRel = relativeEventDate(related.fields.start_at, locale, rtz);
                  return (
                    <Link key={related.id} href={`/${locale}/events/${related.id}`} className="block bg-[var(--card)] p-3.5 rounded-xl border border-[var(--border)] card-hover group">
                      <div className="text-[10px] uppercase tracking-widest text-gold mb-1">
                        {rRel.isTonight || rRel.isTomorrow ? rRel.label : formatDate(related.fields.start_at, locale, rtz)} · {formatTime(related.fields.start_at, rtz)}
                      </div>
                      <h4 className="font-serif text-sm font-bold group-hover:text-gold transition-colors duration-300 leading-tight">
                        {eventTitle(related.fields, locale)}
                      </h4>
                      {rVenue && (
                        <p className="text-[11px] text-[var(--muted-foreground)] mt-1">↗ {displayName(rVenue.fields)}</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      </div>
      </FavoriteHighlight>
    </div>
  );
}
