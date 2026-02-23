/**
 * Airtable REST client for build-time data fetching (SSG/ISR).
 * No SDK — raw fetch per JazzNode SOP.
 */

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
  Sources: '',    // TODO: fill in
} as const;

interface AirtableResponse<T = Record<string, unknown>> {
  records: { id: string; fields: T; createdTime: string }[];
  offset?: string;
}

async function fetchTable<T = Record<string, unknown>>(
  tableId: string,
  params: Record<string, string> = {},
): Promise<{ id: string; fields: T }[]> {
  const all: { id: string; fields: T }[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${BASE_URL}/${tableId}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${API_KEY}` },
      next: { revalidate: 3600 }, // ISR: revalidate every hour
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
  name_local?: string;
  name_en?: string;
  display_name?: string;
  description_zh?: string;
  description_en?: string;
  description_ja?: string;
  city?: string;
  country_code?: string;
  address?: string;           // legacy
  address_local?: string;
  address_en?: string;
  latitude?: number;
  longitude?: number;
  website_url?: string;
  instagram?: string;
  facebook_url?: string;
  photo_url?: string;
  photo_file?: { url: string; filename: string }[];  // legacy, use photo_url
  jazz_frequency?: string;
  capacity?: number;
  event_list?: string[];
  badge_list?: string[];
  verification_status?: string;
  slug?: string;
}

export interface Artist {
  name_local?: string;
  name_en?: string;
  display_name?: string;
  bio_short_en?: string;
  bio_short_zh?: string;
  bio_short_ja?: string;
  description_zh?: string;
  description_en?: string;
  description_ja?: string;
  country_code?: string;
  primary_instrument?: string;
  instrument_list?: string[];
  genres?: string[];
  photo_url?: string;
  photo_file?: { url: string; filename: string }[];  // legacy, use photo_url
  website_url?: string;
  instagram?: string;
  facebook_url?: string;
  spotify_url?: string;
  youtube_url?: string;
  event_list?: string[];
  badge_list?: string[];
  is_master?: boolean;
  verification_status?: string;
  type?: string;
  slug?: string;
}

export interface Event {
  title?: string;           // main title from scraper
  title_en?: string;        // override
  title_local?: string;     // override
  description_en?: string;
  description_zh?: string;
  description_ja?: string;
  description_short_en?: string;
  description_short_zh?: string;
  description_short_ja?: string;
  start_at?: string;
  end_at?: string;
  timezone?: string;        // e.g. "Asia/Taipei"
  venue_id?: string[];      // linked Venues records
  lineup_list?: string[];
  primary_artist?: string[];
  tag_list?: string[];
  ticket_url?: string;
  price_info?: string;
  currency?: string;
  min_price?: number;
  max_price?: number;
  poster_url?: string;  // Wix mainImage URL (high-res event poster)
  photo_file?: { url: string; filename: string }[];  // legacy
  source_list?: string[];
  slug?: string;
}

export interface BadgeDef {
  badge_id?: string;
  name_en?: string;
  name_zh?: string;
  name_ja?: string;
  description?: string;
  description_zh?: string;
  description_ja?: string;
  icon?: string;
}

export interface Lineup {
  lineup_id?: string;
  event_id?: string[];
  artist_id?: string[];
  instrument_list?: string[];
  role?: string;
  order?: number;
  artist_name?: string[];   // lookup
}

export async function getLineups() {
  return fetchTable<Lineup>(TABLE_IDS.Lineups);
}

export async function getVenues() {
  return fetchTable<Venue>(TABLE_IDS.Venues);
}

export async function getArtists() {
  return fetchTable<Artist>(TABLE_IDS.Artists);
}

export async function getEvents() {
  return fetchTable<Event>(TABLE_IDS.Events);
}

export async function getBadges() {
  return fetchTable<BadgeDef>(TABLE_IDS.Badges);
}

// Resolve linked record IDs to objects (for build-time denormalization)
export function resolveLinks<T>(
  ids: string[] | undefined,
  records: { id: string; fields: T }[],
): { id: string; fields: T }[] {
  if (!ids) return [];
  const map = new Map(records.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)).filter(Boolean) as { id: string; fields: T }[];
}
