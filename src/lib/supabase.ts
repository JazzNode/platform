/**
 * Content data layer — reads from Supabase.
 *
 * All fetchers return { id: string; fields: T }[].
 * FK fields are wrapped in arrays for backward compatibility.
 * Derived fields (event_list, badge_list, etc.) are computed from joins.
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const REVALIDATE = {
  cities: 604800,    // 1 week
  venues: 86400,     // 1 day
  artists: 86400,    // 1 day
  events: 3600,      // 1 hour
  badges: 604800,    // 1 week
  tags: 604800,      // 1 week
  lineups: 3600,     // 1 hour
} as const;

// Server-side Supabase client (anon key, respects RLS public read policies)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** Fetch all rows from a Supabase table with pagination (1000 per page). */
async function fetchAll<T>(table: string, select = '*'): Promise<T[]> {
  const sb = getSupabase();
  const all: T[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.from(table).select(select).range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// Legacy: kept for backward compat but no longer needed
export const TABLE_IDS = {
  Venues: 'venues',
  Artists: 'artists',
  Events: 'events',
  Badges: 'badges',
  Tags: 'tags',
  Lineups: 'lineups',
  Cities: 'cities',
} as const;

// ----- Typed interfaces (unchanged) -----

export interface Venue {
  venue_id?: string;
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
  city_id?: string[];        // wrapped FK for backward compat
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
  event_list?: string[];     // derived: event IDs at this venue
  badge_list?: string[];     // derived: from venue_badges junction
  badge_earned_at?: Record<string, string>; // derived: badge_id → earned_at ISO string
  verification_status?: string;
  currency?: string;
  phone?: string;
  contact_email?: string;
  status?: string;
  is_gold_partner?: boolean;
  place_id?: string;
  ticketing_mode_list?: string[];
  ticketing_mode_primary?: string;
  business_hour?: string;
  // Tier
  tier?: number;
  // Data lineage
  data_source?: string;
  updated_by?: string;
}

export interface Artist {
  artist_id?: string;
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
  photo_url?: string;
  website_url?: string;
  instagram?: string;
  facebook_url?: string;
  spotify_url?: string;
  youtube_url?: string;
  event_list?: string[];      // derived: from lineups
  badge_list?: string[];      // derived: from artist_badges junction
  badge_earned_at?: Record<string, string>; // derived: badge_id → earned_at ISO string
  venue_list?: string[];      // derived: from lineups→events
  city_list?: string[];       // derived: from lineups→events→venues
  as_bandleader_list?: string[];   // derived: from lineups
  as_sideman_list?: string[];
  as_featured_guest_list?: string[];
  as_band_member_list?: string[];
  lineup_list?: string[];     // derived: from lineups
  is_master?: boolean;
  verification_status?: string;
  type?: string;
  aka?: string;
  tag_list?: string[];        // derived: from artist_tags junction
  // Teaching fields
  accepting_students?: boolean;
  teaching_styles?: string[];
  teaching_description?: string;
  teaching_description_en?: string;
  teaching_description_zh?: string;
  teaching_description_ja?: string;
  teaching_description_ko?: string;
  teaching_description_th?: string;
  teaching_description_id?: string;
  lesson_price_range?: string;
  // Hire fields
  available_for_hire?: boolean;
  hire_categories?: string[];
  hire_description?: string;
  hire_description_en?: string;
  hire_description_zh?: string;
  hire_description_ja?: string;
  hire_description_ko?: string;
  hire_description_th?: string;
  hire_description_id?: string;
  // Tier
  tier?: number;
  // Data lineage
  data_source?: string;
  updated_by?: string;
}

export interface Event {
  event_id?: string;
  title_local?: string;
  title_en?: string;
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
  timezone?: string;
  venue_id?: string[];        // wrapped FK
  lineup_list?: string[];     // derived: from lineups
  primary_artist?: string[];  // wrapped FK (primary_artist_id)
  tag_list?: string[];        // derived: from event_tags junction
  source_url?: string;
  price_info?: string;
  poster_url?: string;
  source_id?: string[];       // wrapped FK
  subtype?: string;
  lifecycle_status?: string;
  payment_method?: string[];
  popularity?: string;
  promoter_list?: string[];   // derived: from event_promoters junction
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
  category?: string;
  target_type?: string;
  sort_order?: number;
  criteria_target?: number;
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
  venue_list?: string[];      // derived: venues in this city
}

export interface Lineup {
  lineup_id?: string;
  event_id?: string[];        // wrapped FK
  artist_id?: string[];       // wrapped FK
  instrument_list?: string[];
  role?: string;
  order?: number;
  artist_name?: string[];     // deprecated, not populated
  event_title?: string[];     // deprecated, not populated
}

export interface Tag {
  tag_id?: string;
  name?: string;
  category?: string;
  description?: string;
}

// ----- Supabase row types (internal) -----

interface VenueRow {
  venue_id: string;
  name_local: string | null;
  name_en: string | null;
  display_name: string | null;
  description_zh: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_ko: string | null;
  description_th: string | null;
  description_id: string | null;
  friendly_en: boolean;
  friendly_zh: boolean;
  friendly_ja: boolean;
  friendly_ko: boolean;
  friendly_th: boolean;
  friendly_id: boolean;
  payment_method: string[] | null;
  city_id: string | null;
  address_local: string | null;
  address_en: string | null;
  lat: number | null;
  lng: number | null;
  website_url: string | null;
  instagram: string | null;
  facebook_url: string | null;
  photo_url: string | null;
  jazz_frequency: string | null;
  capacity: number | null;
  verification_status: string | null;
  currency: string | null;
  phone: string | null;
  contact_email: string | null;
  status: string | null;
  is_gold_partner: boolean;
  place_id: string | null;
  ticketing_mode_list: string[] | null;
  ticketing_mode_primary: string | null;
  business_hour: string | null;
  country_code: string | null;
  timezone: string | null;
  data_source: string;
  updated_by: string | null;
  tier: number;
}

interface ArtistRow {
  artist_id: string;
  name_local: string | null;
  name_en: string | null;
  display_name: string | null;
  bio_short_en: string | null;
  bio_short_zh: string | null;
  bio_short_ja: string | null;
  bio_short_ko: string | null;
  bio_en: string | null;
  bio_zh: string | null;
  bio_ja: string | null;
  bio_ko: string | null;
  bio_th: string | null;
  bio_id: string | null;
  bio_short_th: string | null;
  bio_short_id: string | null;
  country_code: string | null;
  primary_instrument: string | null;
  instrument_list: string[] | null;
  photo_url: string | null;
  website_url: string | null;
  instagram: string | null;
  facebook_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  is_master: boolean;
  verification_status: string | null;
  type: string | null;
  aka: string | null;
  data_source: string;
  updated_by: string | null;
  // Teaching fields
  accepting_students: boolean;
  teaching_styles: string[] | null;
  teaching_description: string | null;
  teaching_description_en: string | null;
  teaching_description_zh: string | null;
  teaching_description_ja: string | null;
  teaching_description_ko: string | null;
  teaching_description_th: string | null;
  teaching_description_id: string | null;
  lesson_price_range: string | null;
  // Hire fields
  available_for_hire: boolean;
  hire_categories: string[] | null;
  hire_description: string | null;
  hire_description_en: string | null;
  hire_description_zh: string | null;
  hire_description_ja: string | null;
  hire_description_ko: string | null;
  hire_description_th: string | null;
  hire_description_id: string | null;
  // Tier
  tier: number;
}

interface EventRow {
  event_id: string;
  title_local: string | null;
  title_en: string | null;
  description_en: string | null;
  description_zh: string | null;
  description_ja: string | null;
  description_ko: string | null;
  description_th: string | null;
  description_id: string | null;
  description_short_en: string | null;
  description_short_zh: string | null;
  description_short_ja: string | null;
  description_short_ko: string | null;
  description_short_th: string | null;
  description_short_id: string | null;
  start_at: string | null;
  end_at: string | null;
  timezone: string | null;
  venue_id: string | null;
  primary_artist_id: string | null;
  source_url: string | null;
  price_info: string | null;
  poster_url: string | null;
  source_id: string | null;
  subtype: string | null;
  lifecycle_status: string | null;
  payment_method: string[] | null;
  popularity: string | null;
  // Pipeline-owned fields (not exposed to frontend interfaces)
  description_raw: string | null;
  lineup_raw_text: string | null;
  extraction_notes: string | null;
  extraction_run_id: string | null;
  fetched_at: string | null;
  raw_payload_hash: string | null;
  raw_payload_url: string | null;
}

interface LineupRow {
  lineup_id: string;
  event_id: string | null;
  artist_id: string | null;
  instrument_list: string[] | null;
  role: string | null;
  sort_order: number;
}

interface CityRow {
  city_id: string;
  name_local: string | null;
  name_en: string | null;
  name_zh: string | null;
  name_ja: string | null;
  name_ko: string | null;
  name_th: string | null;
  name_id: string | null;
  country_code: string | null;
  timezone: string | null;
}

interface BadgeRow {
  badge_id: string;
  name_en: string | null;
  name_zh: string | null;
  name_ja: string | null;
  name_ko: string | null;
  name_th: string | null;
  name_id: string | null;
  description_en: string | null;
  description_zh: string | null;
  description_ja: string | null;
  description_ko: string | null;
  description_th: string | null;
  description_id: string | null;
  icon_url: string | null;
  criteria: string | null;
  category: string | null;
  target_type: string | null;
  sort_order: number | null;
  criteria_target: number | null;
}

interface TagRow {
  tag_id: string;
  name: string | null;
  category: string | null;
  description: string | null;
}

// Helper: wrap a scalar FK into a string[] (or undefined)
function wrapFK(val: string | null | undefined): string[] | undefined {
  return val ? [val] : undefined;
}

/** Strip null/undefined values so downstream code can treat missing fields as absent. */
function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) clean[k] = v;
  }
  return clean;
}

// ----- Junction data (shared across enrichment) -----

interface JunctionData {
  artistBadges: { artist_id: string; badge_id: string; earned_at: string | null }[];
  venueBadges: { venue_id: string; badge_id: string; earned_at: string | null }[];
  artistTags: { artist_id: string; tag_id: string }[];
  eventTags: { event_id: string; tag_id: string }[];
  eventPromoters: { event_id: string; promoter_id: string }[];
}

const getJunctionData = cache(
  unstable_cache(
    async (): Promise<JunctionData> => {
      const [artistBadges, venueBadges, artistTags, eventTags, eventPromoters] = await Promise.all([
        fetchAll<{ artist_id: string; badge_id: string; earned_at: string | null }>('artist_badges'),
        fetchAll<{ venue_id: string; badge_id: string; earned_at: string | null }>('venue_badges'),
        fetchAll<{ artist_id: string; tag_id: string }>('artist_tags'),
        fetchAll<{ event_id: string; tag_id: string }>('event_tags'),
        fetchAll<{ event_id: string; promoter_id: string }>('event_promoters'),
      ]);
      return { artistBadges, venueBadges, artistTags, eventTags, eventPromoters };
    },
    ['supabase-junctions'],
    { revalidate: REVALIDATE.events, tags: ['artists', 'venues', 'events'] },
  ),
);

// ----- Public fetchers -----

export const getCities = cache(
  unstable_cache(
    async () => {
      const rows = await fetchAll<CityRow>('cities');
      // Derive venue_list from venues table
      const venueRows = await fetchAll<{ venue_id: string; city_id: string | null }>('venues', 'venue_id, city_id');
      const cityVenues = new Map<string, string[]>();
      for (const v of venueRows) {
        if (v.city_id) {
          const arr = cityVenues.get(v.city_id) || [];
          arr.push(v.venue_id);
          cityVenues.set(v.city_id, arr);
        }
      }

      const cities = rows.map((r) => ({
        id: r.city_id,
        fields: stripNulls({
          ...r,
          venue_list: cityVenues.get(r.city_id) || undefined,
        }) as City,
      }));
      return cities.sort((a, b) => {
        const aName = a.fields.name_en || a.fields.name_local || '';
        const bName = b.fields.name_en || b.fields.name_local || '';
        return aName.localeCompare(bName);
      });
    },
    ['supabase-cities'],
    { revalidate: REVALIDATE.cities, tags: ['cities'] },
  ),
);

export const getTags = cache(
  unstable_cache(
    async () => {
      const rows = await fetchAll<TagRow>('tags');
      return rows.map((r) => ({
        id: r.tag_id,
        fields: stripNulls(r as unknown as Record<string, unknown>) as Tag,
      }));
    },
    ['supabase-tags'],
    { revalidate: REVALIDATE.tags, tags: ['tags'] },
  ),
);

export const getLineups = cache(
  unstable_cache(
    async () => {
      const rows = await fetchAll<LineupRow>('lineups');
      return rows.map((r) => ({
        id: r.lineup_id,
        fields: stripNulls({
          lineup_id: r.lineup_id,
          event_id: wrapFK(r.event_id),
          artist_id: wrapFK(r.artist_id),
          instrument_list: r.instrument_list,
          role: r.role,
          order: r.sort_order,
        }) as Lineup,
      }));
    },
    ['supabase-lineups'],
    { revalidate: REVALIDATE.lineups, tags: ['lineups'] },
  ),
);

export const getVenues = cache(
  unstable_cache(
    async () => {
      const [rows, junctions] = await Promise.all([
        fetchAll<VenueRow>('venues'),
        getJunctionData(),
      ]);

      // Build venue→events from events table
      const eventRows = await fetchAll<{ event_id: string; venue_id: string | null }>('events', 'event_id, venue_id');
      const venueEvents = new Map<string, string[]>();
      for (const e of eventRows) {
        if (e.venue_id) {
          const arr = venueEvents.get(e.venue_id) || [];
          arr.push(e.event_id);
          venueEvents.set(e.venue_id, arr);
        }
      }

      // Build venue→badges from junction
      const venueBadges = new Map<string, string[]>();
      const venueBadgeEarnedAt = new Map<string, Record<string, string>>();
      for (const jn of junctions.venueBadges) {
        const arr = venueBadges.get(jn.venue_id) || [];
        arr.push(jn.badge_id);
        venueBadges.set(jn.venue_id, arr);
        if (jn.earned_at) {
          const map = venueBadgeEarnedAt.get(jn.venue_id) || {};
          map[jn.badge_id] = jn.earned_at;
          venueBadgeEarnedAt.set(jn.venue_id, map);
        }
      }

      return rows.map((r) => ({
        id: r.venue_id,
        fields: stripNulls({
          ...r,
          city_id: wrapFK(r.city_id),
          event_list: venueEvents.get(r.venue_id),
          badge_list: venueBadges.get(r.venue_id),
          badge_earned_at: venueBadgeEarnedAt.get(r.venue_id),
        } as Record<string, unknown>) as Venue,
      }));
    },
    ['supabase-venues'],
    { revalidate: REVALIDATE.venues, tags: ['venues'] },
  ),
);

export const getArtists = cache(
  unstable_cache(
    async () => {
      const [rows, lineupRows, junctions] = await Promise.all([
        fetchAll<ArtistRow>('artists'),
        fetchAll<LineupRow>('lineups'),
        getJunctionData(),
      ]);

      // Also need events for venue/city derivation
      const eventRows = await fetchAll<{ event_id: string; venue_id: string | null }>('events', 'event_id, venue_id');
      const eventVenueMap = new Map<string, string>();
      for (const e of eventRows) {
        if (e.venue_id) eventVenueMap.set(e.event_id, e.venue_id);
      }

      const venueRows = await fetchAll<{ venue_id: string; city_id: string | null }>('venues', 'venue_id, city_id');
      const venueCityMap = new Map<string, string>();
      for (const v of venueRows) {
        if (v.city_id) venueCityMap.set(v.venue_id, v.city_id);
      }

      // Build artist→lineups, artist→events, artist→venues, artist→cities
      const artistLineups = new Map<string, string[]>();
      const artistEvents = new Map<string, Set<string>>();
      const artistVenues = new Map<string, Set<string>>();
      const artistCities = new Map<string, Set<string>>();
      // Role-based collaborator lists
      const artistByRole = new Map<string, Map<string, Set<string>>>();

      for (const l of lineupRows) {
        if (!l.artist_id || !l.event_id) continue;

        // lineup_list
        const lups = artistLineups.get(l.artist_id) || [];
        lups.push(l.lineup_id);
        artistLineups.set(l.artist_id, lups);

        // event_list
        const evts = artistEvents.get(l.artist_id) || new Set();
        evts.add(l.event_id);
        artistEvents.set(l.artist_id, evts);

        // venue_list
        const venueId = eventVenueMap.get(l.event_id);
        if (venueId) {
          const vens = artistVenues.get(l.artist_id) || new Set();
          vens.add(venueId);
          artistVenues.set(l.artist_id, vens);

          // city_list
          const cityId = venueCityMap.get(venueId);
          if (cityId) {
            const cities = artistCities.get(l.artist_id) || new Set();
            cities.add(cityId);
            artistCities.set(l.artist_id, cities);
          }
        }

        // as_*_list: group co-performers by role
        if (l.role) {
          const roleKey = `as_${l.role}_list`;
          // For each event, find other artists with this role
          if (!artistByRole.has(l.event_id)) artistByRole.set(l.event_id, new Map());
          const eventRoles = artistByRole.get(l.event_id)!;
          if (!eventRoles.has(roleKey)) eventRoles.set(roleKey, new Set());
          eventRoles.get(roleKey)!.add(l.artist_id);
        }
      }

      // Build as_*_list: for each artist, find events where they appear,
      // then collect other artists with specific roles in those events
      const artistRoleLists = new Map<string, { bandleader: Set<string>; sideman: Set<string>; featured_guest: Set<string>; band_member: Set<string> }>();

      for (const l of lineupRows) {
        if (!l.artist_id || !l.event_id) continue;
        // Find all co-performers in this event and their roles
        const coPerformers = lineupRows.filter(
          (l2) => l2.event_id === l.event_id && l2.artist_id && l2.artist_id !== l.artist_id,
        );
        if (!artistRoleLists.has(l.artist_id)) {
          artistRoleLists.set(l.artist_id, {
            bandleader: new Set(),
            sideman: new Set(),
            featured_guest: new Set(),
            band_member: new Set(),
          });
        }
        const lists = artistRoleLists.get(l.artist_id)!;
        for (const cp of coPerformers) {
          if (cp.role === 'bandleader') lists.bandleader.add(cp.artist_id!);
          else if (cp.role === 'sideman') lists.sideman.add(cp.artist_id!);
          else if (cp.role === 'featured_guest') lists.featured_guest.add(cp.artist_id!);
          else if (cp.role === 'band_member') lists.band_member.add(cp.artist_id!);
        }
      }

      // Build artist→badges from junction
      const aBadges = new Map<string, string[]>();
      const aBadgeEarnedAt = new Map<string, Record<string, string>>();
      for (const jn of junctions.artistBadges) {
        const arr = aBadges.get(jn.artist_id) || [];
        arr.push(jn.badge_id);
        aBadges.set(jn.artist_id, arr);
        if (jn.earned_at) {
          const map = aBadgeEarnedAt.get(jn.artist_id) || {};
          map[jn.badge_id] = jn.earned_at;
          aBadgeEarnedAt.set(jn.artist_id, map);
        }
      }

      // Build artist→tags from junction
      const aTags = new Map<string, string[]>();
      for (const jn of junctions.artistTags) {
        const arr = aTags.get(jn.artist_id) || [];
        arr.push(jn.tag_id);
        aTags.set(jn.artist_id, arr);
      }

      return rows.map((r) => {
        const rl = artistRoleLists.get(r.artist_id);
        return {
          id: r.artist_id,
          fields: stripNulls({
            ...r,
            event_list: artistEvents.has(r.artist_id) ? [...artistEvents.get(r.artist_id)!] : undefined,
            venue_list: artistVenues.has(r.artist_id) ? [...artistVenues.get(r.artist_id)!] : undefined,
            city_list: artistCities.has(r.artist_id) ? [...artistCities.get(r.artist_id)!] : undefined,
            lineup_list: artistLineups.get(r.artist_id),
            badge_list: aBadges.get(r.artist_id),
            badge_earned_at: aBadgeEarnedAt.get(r.artist_id),
            tag_list: aTags.get(r.artist_id),
            as_bandleader_list: rl?.bandleader.size ? [...rl.bandleader] : undefined,
            as_sideman_list: rl?.sideman.size ? [...rl.sideman] : undefined,
            as_featured_guest_list: rl?.featured_guest.size ? [...rl.featured_guest] : undefined,
            as_band_member_list: rl?.band_member.size ? [...rl.band_member] : undefined,
          } as Record<string, unknown>) as Artist,
        };
      });
    },
    ['supabase-artists'],
    { revalidate: REVALIDATE.artists, tags: ['artists'] },
  ),
);

export const getEvents = cache(
  unstable_cache(
    async () => {
      const [rows, junctions] = await Promise.all([
        fetchAll<EventRow>('events'),
        getJunctionData(),
      ]);

      // Build event→lineups from lineups table
      const lineupRows = await fetchAll<{ lineup_id: string; event_id: string | null }>('lineups', 'lineup_id, event_id');
      const eventLineups = new Map<string, string[]>();
      for (const l of lineupRows) {
        if (l.event_id) {
          const arr = eventLineups.get(l.event_id) || [];
          arr.push(l.lineup_id);
          eventLineups.set(l.event_id, arr);
        }
      }

      // Build event→tags from junction
      const eTags = new Map<string, string[]>();
      for (const jn of junctions.eventTags) {
        const arr = eTags.get(jn.event_id) || [];
        arr.push(jn.tag_id);
        eTags.set(jn.event_id, arr);
      }

      // Build event→promoters from junction
      const eProms = new Map<string, string[]>();
      for (const jn of junctions.eventPromoters) {
        const arr = eProms.get(jn.event_id) || [];
        arr.push(jn.promoter_id);
        eProms.set(jn.event_id, arr);
      }

      return rows.map((r) => ({
        id: r.event_id,
        fields: stripNulls({
          ...r,
          venue_id: wrapFK(r.venue_id),
          primary_artist: wrapFK(r.primary_artist_id),
          lineup_list: eventLineups.get(r.event_id),
          tag_list: eTags.get(r.event_id),
          source_id: wrapFK(r.source_id),
          promoter_list: eProms.get(r.event_id),
          // Remove the raw Supabase FK field names that differ from interface
          primary_artist_id: undefined,
        } as Record<string, unknown>) as Event,
      }));
    },
    ['supabase-events'],
    { revalidate: REVALIDATE.events, tags: ['events'] },
  ),
);

export const getBadges = cache(
  unstable_cache(
    async () => {
      const rows = await fetchAll<BadgeRow>('badges');
      return rows.map((r) => ({
        id: r.badge_id,
        fields: stripNulls(r as unknown as Record<string, unknown>) as BadgeDef,
      }));
    },
    ['supabase-badges'],
    { revalidate: REVALIDATE.badges, tags: ['badges'] },
  ),
);

// ----- Artist Gear fetcher -----

export const getArtistGear = cache(async (artistId: string) => {
  const sb = getSupabase();
  const { data } = await sb
    .from('artist_gear')
    .select('*')
    .eq('artist_id', artistId)
    .order('display_order');
  return (data || []) as { id: string; gear_name: string; gear_type: string; brand: string | null; model: string | null; photo_url: string | null; display_order: number }[];
});

// ----- Utility functions (unchanged) -----

export function buildMap<T>(records: { id: string; fields: T }[]): Map<string, { id: string; fields: T }> {
  return new Map(records.map((r) => [r.id, r]));
}

export function resolveLinks<T>(
  ids: string[] | undefined,
  recordsOrMap: { id: string; fields: T }[] | Map<string, { id: string; fields: T }>,
): { id: string; fields: T }[] {
  if (!ids) return [];
  const map = recordsOrMap instanceof Map ? recordsOrMap : new Map(recordsOrMap.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)).filter(Boolean) as { id: string; fields: T }[];
}

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

export function venueEventCount(
  venue: { id: string; fields: Venue },
  fallbackCounts?: Map<string, number>,
): number {
  const linked = venue.fields.event_list?.length || 0;
  if (linked > 0) return linked;
  return fallbackCounts?.get(venue.id) || 0;
}

/** Get follower count for a venue or artist. */
export async function getFollowerCount(targetType: 'artist' | 'venue', targetId: string): Promise<number> {
  const sb = getSupabase();
  const { count } = await sb
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', targetType)
    .eq('target_id', targetId);
  return count ?? 0;
}

/** Country codes that have at least one city with an active venue (venue with events). */
export const getActiveRegionCodes = cache(
  unstable_cache(
    async (): Promise<string[]> => {
      const [cities, venues] = await Promise.all([getCities(), getVenues()]);
      const codes = new Set<string>();
      for (const city of cities) {
        const hasActiveVenue = venues.some(
          (v) => v.fields.city_id?.includes(city.id) && v.fields.event_list && v.fields.event_list.length > 0,
        );
        if (hasActiveVenue && city.fields.country_code) {
          codes.add(city.fields.country_code);
        }
      }
      return [...codes];
    },
    ['supabase-active-region-codes'],
    { revalidate: REVALIDATE.cities, tags: ['cities', 'venues'] },
  ),
);
