/**
 * Airtable REST client for build-time data fetching (SSG/ISR).
 * No SDK — raw fetch per JazzNode SOP.
 *
 * All public fetchers are wrapped with React.cache() to deduplicate
 * identical calls within the same server request (e.g. generateMetadata
 * + page component both calling getArtists()).
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';

/**
 * Per-table revalidation intervals (seconds).
 * These are fallback timers — primary invalidation comes from
 * the /api/revalidate webhook endpoint via revalidateTag().
 */
const REVALIDATE = {
  cities: 604800,    // 1 week  — rarely changes
  venues: 86400,     // 1 day   — occasional updates
  artists: 86400,    // 1 day   — occasional updates
  events: 3600,      // 1 hour  — frequent updates
  badges: 604800,    // 1 week  — rarely changes
  tags: 604800,      // 1 week  — rarely changes
  lineups: 3600,     // 1 hour  — tied to events
} as const;

const API_KEY = process.env.AIRTABLE_API_KEY!;
const BASE_ID = process.env.AIRTABLE_BASE_ID!;
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

export const TABLE_IDS = {
  Venues: 'tblEUNFzTZRYnaPIg',
  Artists: 'tblNEPMBzkcJhdf6l',
  Events: 'tblRgZo5YRDkkOn4N',
  Badges: 'tblUw23zLyqU8BYpF',
  Tags: 'tblJ1hlwVdHLv2Z2s',
  Lineups: 'tblDd2gI9smwyoCI1',
  Cities: 'tblV4kFurFNHYKEhh',
} as const;

interface AirtableResponse<T = Record<string, unknown>> {
  records: { id: string; fields: T; createdTime: string }[];
  offset?: string;
}

async function fetchTable<T = Record<string, unknown>>(
  tableId: string,
  params: Record<string, string> = {},
  options: { fields?: string[]; formula?: string } = {},
): Promise<{ id: string; fields: T }[]> {
  const all: { id: string; fields: T }[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${BASE_URL}/${tableId}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (options.fields) {
      for (const f of options.fields) url.searchParams.append('fields[]', f);
    }
    if (options.formula) url.searchParams.set('filterByFormula', options.formula);
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${API_KEY}` },
      cache: 'no-store', // page-level revalidate handles ISR; per-fetch caching breaks Airtable pagination (offset tokens expire in ~5min)
    });

    if (!res.ok) {
      throw new Error(`Airtable ${res.status}: ${await res.text()}`);
    }

    const data: AirtableResponse<T> = await res.json();
    all.push(...data.records.map((r) => ({ id: r.id, fields: r.fields })));
    offset = data.offset;
  } while (offset);

  return all;
}

// ----- Typed fetchers -----

export interface Venue {
  venue_id?: string;          // immutable slug (e.g. tw-tpe-bluenote)
  name_local?: string;
  name_en?: string;
  display_name?: string;
  description_zh?: string;
  description_en?: string;
  description_ja?: string;
  description_ko?: string;
  description_th?: string;
  description_id?: string;
  friendly_en?: boolean;
  friendly_zh?: boolean;
  friendly_ja?: boolean;
  friendly_ko?: boolean;
  friendly_th?: boolean;
  friendly_id?: boolean;
  payment_method?: string[];
  city_id?: string[];       // linked Cities records
  address_local?: string;
  address_en?: string;
  lat?: number;
  lng?: number;
  website_url?: string;
  instagram?: string;
  facebook_url?: string;
  photo_url?: string;
  jazz_frequency?: string;
  capacity?: number;
  event_list?: string[];
  badge_list?: string[];
  verification_status?: string;
  currency?: string;
  phone?: string;
  contact_email?: string;
  status?: string;              // active | inactive | closed
  is_gold_partner?: boolean;
  place_id?: string;            // Google Place ID
}

export interface Artist {
  artist_id?: string;         // immutable slug (e.g. tw-lin-yu-ting)
  name_local?: string;
  name_en?: string;
  display_name?: string;
  bio_short_en?: string;
  bio_short_zh?: string;
  bio_short_ja?: string;
  bio_short_ko?: string;
  bio_en?: string;
  bio_zh?: string;
  bio_ja?: string;
  bio_ko?: string;
  bio_th?: string;
  bio_id?: string;
  bio_short_th?: string;
  bio_short_id?: string;
  country_code?: string;
  primary_instrument?: string;
  instrument_list?: string[];
  genres?: string[];
  photo_url?: string;
  website_url?: string;
  instagram?: string;
  facebook_url?: string;
  spotify_url?: string;
  youtube_url?: string;
  event_list?: string[];
  badge_list?: string[];
  venue_list?: string[];
  city_list?: string[];
  as_bandleader_list?: string[];
  as_sideman_list?: string[];
  as_featured_guest_list?: string[];
  as_band_member_list?: string[];
  lineup_list?: string[];
  is_master?: boolean;
  verification_status?: string;
  type?: string;
}

export interface Event {
  event_id?: string;        // immutable slug (e.g. 2026-02-15_tw-tpe-bluenote_tw-band_2000)
  title_local?: string;     // original-language title (CJK, Thai, Korean, etc.)
  title_en?: string;        // English title (from ingest or content_generator translation)
  description_en?: string;
  description_zh?: string;
  description_ja?: string;
  description_ko?: string;
  description_th?: string;
  description_id?: string;
  description_short_en?: string;
  description_short_zh?: string;
  description_short_ja?: string;
  description_short_ko?: string;
  description_short_th?: string;
  description_short_id?: string;
  start_at?: string;
  end_at?: string;
  timezone?: string;        // e.g. "Asia/Taipei"
  venue_id?: string[];      // linked Venues records
  lineup_list?: string[];
  primary_artist?: string[];
  tag_list?: string[];
  source_url?: string;
  price_info?: string;
  poster_url?: string;      // event poster URL (high-res)
  source_id?: string[];     // linked Sources records
  subtype?: string;           // 'standard_show' | 'jam_session' | 'showcase' | 'workshop'
  lifecycle_status?: string;  // 'upcoming' | 'past' | 'cancelled' | 'unknown'
}

export interface BadgeDef {
  badge_id?: string;
  name_en?: string;
  name_zh?: string;
  name_ja?: string;
  name_ko?: string;
  name_th?: string;
  name_id?: string;
  description_en?: string;
  description_zh?: string;
  description_ja?: string;
  description_ko?: string;
  description_th?: string;
  description_id?: string;
  icon_url?: string;
}

export interface City {
  city_id?: string;
  name_local?: string;
  name_en?: string;
  name_zh?: string;
  name_ja?: string;
  name_ko?: string;
  name_th?: string;
  name_id?: string;
  country_code?: string;
  timezone?: string;
}

export interface Lineup {
  lineup_id?: string;
  event_id?: string[];
  artist_id?: string[];
  instrument_list?: string[];
  role?: string;
  order?: number;
  artist_name?: string[];   // lookup
  event_title?: string[];   // lookup
}

export const getCities = cache(
  unstable_cache(
    async () => {
      const cities = await fetchTable<City>(TABLE_IDS.Cities);
      return cities.sort((a, b) => {
        const aName = a.fields.name_en || a.fields.name_local || '';
        const bName = b.fields.name_en || b.fields.name_local || '';
        return aName.localeCompare(bName);
      });
    },
    ['airtable-cities'],
    { revalidate: REVALIDATE.cities, tags: ['cities'] },
  ),
);

export interface Tag {
  name?: string;
}

export const getTags = cache(
  unstable_cache(
    async () => fetchTable<Tag>(TABLE_IDS.Tags),
    ['airtable-tags'],
    { revalidate: REVALIDATE.tags, tags: ['tags'] },
  ),
);

export const getLineups = cache(
  unstable_cache(
    async () => fetchTable<Lineup>(TABLE_IDS.Lineups),
    ['airtable-lineups'],
    { revalidate: REVALIDATE.lineups, tags: ['lineups'] },
  ),
);

export const getVenues = cache(
  unstable_cache(
    async () => fetchTable<Venue>(TABLE_IDS.Venues),
    ['airtable-venues'],
    { revalidate: REVALIDATE.venues, tags: ['venues'] },
  ),
);

export const getArtists = cache(
  unstable_cache(
    async () => fetchTable<Artist>(TABLE_IDS.Artists),
    ['airtable-artists'],
    { revalidate: REVALIDATE.artists, tags: ['artists'] },
  ),
);

export const getEvents = cache(
  unstable_cache(
    async () => fetchTable<Event>(TABLE_IDS.Events),
    ['airtable-events'],
    { revalidate: REVALIDATE.events, tags: ['events'] },
  ),
);

export const getBadges = cache(
  unstable_cache(
    async () => fetchTable<BadgeDef>(TABLE_IDS.Badges),
    ['airtable-badges'],
    { revalidate: REVALIDATE.badges, tags: ['badges'] },
  ),
);

// Build a lookup map from records (call once, reuse across multiple resolveLinks calls)
export function buildMap<T>(records: { id: string; fields: T }[]): Map<string, { id: string; fields: T }> {
  return new Map(records.map((r) => [r.id, r]));
}

// Resolve linked record IDs to objects (for build-time denormalization)
export function resolveLinks<T>(
  ids: string[] | undefined,
  recordsOrMap: { id: string; fields: T }[] | Map<string, { id: string; fields: T }>,
): { id: string; fields: T }[] {
  if (!ids) return [];
  const map = recordsOrMap instanceof Map ? recordsOrMap : new Map(recordsOrMap.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)).filter(Boolean) as { id: string; fields: T }[];
}

/**
 * Build a venue→eventCount map directly from Events data.
 * Fallback for when Venue.event_list (linked field) is empty
 * because artist_enricher --derive-only hasn't run yet.
 */
export function buildVenueEventCounts(
  events: { id: string; fields: Event }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of events) {
    const venueIds = e.fields.venue_id || [];
    for (const vid of venueIds) {
      counts.set(vid, (counts.get(vid) || 0) + 1);
    }
  }
  return counts;
}

/**
 * Get the event count for a venue, preferring the linked event_list,
 * falling back to a pre-computed counts map.
 */
export function venueEventCount(
  venue: { id: string; fields: Venue },
  fallbackCounts?: Map<string, number>,
): number {
  const linked = venue.fields.event_list?.length || 0;
  if (linked > 0) return linked;
  return fallbackCounts?.get(venue.id) || 0;
}
