/**
 * Client-side search engine for JazzNode.
 * Fuzzy matching across events, artists, venues, cities with weighted scoring.
 */

export interface SearchableEvent {
  id: string;
  title: string;
  start_at: string | null;
  venue_name: string;
  primary_artist_name: string | null;
  description_short: string | null;
  date_display: string;
  time_display: string;
}

export interface SearchableArtist {
  id: string;
  displayName: string;
  type: string | null;
  primaryInstrument: string | null;
  countryCode: string | null;
  bio: string | null;
  photoUrl: string | null;
}

export interface SearchableVenue {
  id: string;
  displayName: string;
  cityName: string;
  address: string | null;
  jazz_frequency: string | null;
}

export interface SearchableCity {
  id: string;
  citySlug: string;
  name: string;
  venueCount: number;
}

export type SearchResultType = 'event' | 'artist' | 'venue' | 'city';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  score: number;
  data: SearchableEvent | SearchableArtist | SearchableVenue | SearchableCity;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function matchScore(query: string, text: string | null | undefined): number {
  if (!text) return 0;
  const q = normalize(query);
  const t = normalize(text);
  if (t === q) return 100;           // exact match
  if (t.startsWith(q)) return 80;    // starts with
  if (t.includes(q)) return 60;      // contains
  // Simple fuzzy: check if all query chars appear in order
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  if (qi === q.length) return 30;    // fuzzy match
  return 0;
}

export function search(
  query: string,
  data: {
    events: SearchableEvent[];
    artists: SearchableArtist[];
    venues: SearchableVenue[];
    cities: SearchableCity[];
  },
  filter: SearchResultType | 'all' = 'all',
): SearchResult[] {
  const q = normalize(query);
  if (!q) return [];

  const results: SearchResult[] = [];

  if (filter === 'all' || filter === 'event') {
    for (const e of data.events) {
      const score = Math.max(
        matchScore(q, e.title) * 1.5,
        matchScore(q, e.primary_artist_name) * 1.2,
        matchScore(q, e.venue_name),
        matchScore(q, e.description_short) * 0.5,
      );
      if (score > 0) results.push({ type: 'event', id: e.id, score, data: e });
    }
  }

  if (filter === 'all' || filter === 'artist') {
    for (const a of data.artists) {
      const score = Math.max(
        matchScore(q, a.displayName) * 1.5,
        matchScore(q, a.primaryInstrument) * 0.8,
        matchScore(q, a.bio) * 0.4,
      );
      if (score > 0) results.push({ type: 'artist', id: a.id, score, data: a });
    }
  }

  if (filter === 'all' || filter === 'venue') {
    for (const v of data.venues) {
      const score = Math.max(
        matchScore(q, v.displayName) * 1.5,
        matchScore(q, v.cityName),
        matchScore(q, v.address) * 0.6,
      );
      if (score > 0) results.push({ type: 'venue', id: v.id, score, data: v });
    }
  }

  if (filter === 'all' || filter === 'city') {
    for (const c of data.cities) {
      const score = Math.max(
        matchScore(q, c.name) * 1.5,
        matchScore(q, c.citySlug),
      );
      if (score > 0) results.push({ type: 'city', id: c.id, score, data: c });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
