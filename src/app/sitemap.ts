import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com';
const LOCALES = ['en', 'zh', 'ja', 'ko', 'th', 'id'] as const;

/** Lightweight ID-only fetch for sitemap (avoids full enrichment). */
async function fetchIds(table: string, idCol: string): Promise<string[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const ids: string[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.from(table).select(idCol).range(from, from + PAGE - 1);
    if (error) throw new Error(`sitemap ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ids.push(...(data as any[]).map((r) => r[idCol] as string));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return ids;
}

/** Build a sitemap entry with hreflang alternates for all 6 locales. */
function entry(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number,
  lastModified?: Date,
): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const loc of LOCALES) {
    languages[loc === 'zh' ? 'zh-Hant' : loc] = `${SITE_URL}/${loc}${path}`;
  }
  return {
    url: `${SITE_URL}/en${path}`,
    lastModified: lastModified ?? new Date(),
    changeFrequency,
    priority,
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [artistIds, eventIds, venueIds] = await Promise.all([
    fetchIds('artists', 'artist_id'),
    fetchIds('events', 'event_id'),
    fetchIds('venues', 'venue_id'),
  ]);

  const now = new Date();

  // Static pages
  const staticEntries: MetadataRoute.Sitemap = [
    entry('', 'daily', 1.0, now),
    entry('/artists', 'daily', 0.9, now),
    entry('/events', 'daily', 0.9, now),
    entry('/venues', 'daily', 0.9, now),
    entry('/cities', 'daily', 0.9, now),
  ];

  // Dynamic pages
  const artistEntries = artistIds.map((id) =>
    entry(`/artists/${encodeURIComponent(id)}`, 'weekly', 0.7, now),
  );
  const eventEntries = eventIds.map((id) =>
    entry(`/events/${encodeURIComponent(id)}`, 'weekly', 0.8, now),
  );
  const venueEntries = venueIds.map((id) =>
    entry(`/venues/${encodeURIComponent(id)}`, 'weekly', 0.7, now),
  );

  return [...staticEntries, ...eventEntries, ...artistEntries, ...venueEntries];
}
