export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import { getEvents, getVenues, getArtists, getLineups, getCities, getTags, resolveLinks } from '@/lib/airtable';
import { displayName, formatDate, formatTime, localized } from '@/lib/helpers';
import EventsClient from '@/components/EventsClient';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('events') };
}

export default async function EventsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ view?: string }> }) {
  const { locale } = await params;
  const { view } = await searchParams;
  const t = await getTranslations('common');
  const showPast = view === 'past';

  const [events, venues, artists, lineups, cities, tagsResult] = await Promise.all([
    getEvents(), getVenues(), getArtists(), getLineups(), getCities(), getTags().catch(() => []),
  ]);
  const tags = tagsResult;

  const now = new Date().toISOString();
  const upcoming = events
    .filter((e) => e.fields.start_at && e.fields.start_at >= now)
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));
  const past = events
    .filter((e) => e.fields.start_at && e.fields.start_at < now)
    .sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''));

  const displayEvents = showPast ? past : upcoming;

  // Serialize events for client component
  const serializedEvents = displayEvents.map((event) => {
    const tz = event.fields.timezone || 'Asia/Taipei';
    const venue = resolveLinks(event.fields.venue_id, venues)[0];
    const primaryArtist = resolveLinks(event.fields.primary_artist, artists)[0];
    const eventLineups = lineups
      .filter((l) => l.fields.event_id?.some((eid) => eid === event.id))
      .sort((a, b) => (a.fields.order || 99) - (b.fields.order || 99));
    const lineupArtists = eventLineups
      .map((l) => resolveLinks(l.fields.artist_id, artists)[0])
      .filter(Boolean)
      .filter((a) => a.id !== primaryArtist?.id);

    const eventTags = resolveLinks(event.fields.tag_list, tags)
      .map((tag) => tag.fields.name)
      .filter(Boolean) as string[];

    return {
      id: event.id,
      title: event.fields.title || event.fields.title_local || event.fields.title_en || 'Event',
      start_at: event.fields.start_at || null,
      timezone: tz,
      venue_id: venue?.id || null,
      venue_name: venue ? displayName(venue.fields) : '',
      city_record_id: venue?.fields.city_id?.[0] || null,
      primary_artist_name: primaryArtist ? displayName(primaryArtist.fields) : null,
      sidemen: lineupArtists.map((a) => displayName(a.fields)),
      description_short: localized(event.fields as Record<string, unknown>, 'description_short', locale) || null,
      date_display: formatDate(event.fields.start_at, locale, tz),
      time_display: formatTime(event.fields.start_at, tz),
      tags: eventTags,
    };
  });

  // Build city options (only cities that have venues with events)
  const cityIdsInUse = new Set(
    venues.flatMap((v) => v.fields.city_id || [])
  );
  const cityOptions = cities
    .filter((c) => cityIdsInUse.has(c.id))
    .map((c) => ({
      recordId: c.id,
      label: locale === 'en' ? (c.fields.name_en || c.fields.name_local || '') : (c.fields.name_local || c.fields.name_en || ''),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Build venue options
  const venueOptions = venues
    .filter((v) => v.fields.event_list && v.fields.event_list.length > 0)
    .map((v) => ({
      recordId: v.id,
      label: displayName(v.fields),
      cityRecordId: v.fields.city_id?.[0] || null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <EventsClient
      events={serializedEvents}
      cities={cityOptions}
      venues={venueOptions}
      locale={locale}
      showPast={showPast}
      labels={{
        allCities: t('allCities'),
        allVenues: t('allVenues'),
        allCategories: t('allCategories'),
        jamSession: t('jamSession'),
        withVocal: t('withVocal'),
        events: t('events'),
        pastEvents: t('pastEvents'),
        upcomingCount: t('upcomingCount'),
        pastCount: t('pastCount'),
        noEvents: t('noEvents'),
        toggleLink: showPast ? `← ${t('events')}` : `${t('pastEvents')} →`,
      }}
    />
  );
}
