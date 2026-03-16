import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com';
const LOCALES = ['en', 'zh', 'ja', 'ko', 'th', 'id'] as const;

interface SitemapRow {
  id: string;
  updated_at: string | null;
}

/** Lightweight fetch of id + updated_at for sitemap. */
async function fetchForSitemap(table: string, idCol: string): Promise<SitemapRow[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const rows: SitemapRow[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.from(table).select(`${idCol}, updated_at`).range(from, from + PAGE - 1);
    if (error) throw new Error(`sitemap ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows.push(...(data as any[]).map((r) => ({ id: r[idCol] as string, updated_at: r.updated_at as string | null })));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
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

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [artistRows, eventRows, venueRows, cityRows] = await Promise.all([
    fetchForSitemap('artists', 'artist_id'),
    fetchForSitemap('events', 'event_id'),
    fetchForSitemap('venues', 'venue_id'),
    fetchForSitemap('cities', 'city_id'),
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

  // Dynamic pages — use real updated_at for lastmod
  const artistEntries = artistRows.map((r) =>
    entry(`/artists/${encodeURIComponent(r.id)}`, 'weekly', 0.7, r.updated_at ? new Date(r.updated_at) : now),
  );
  const eventEntries = eventRows.map((r) =>
    entry(`/events/${encodeURIComponent(r.id)}`, 'weekly', 0.8, r.updated_at ? new Date(r.updated_at) : now),
  );
  const venueEntries = venueRows.map((r) =>
    entry(`/venues/${encodeURIComponent(r.id)}`, 'weekly', 0.7, r.updated_at ? new Date(r.updated_at) : now),
  );
  const cityEntries = cityRows.map((r) =>
    entry(`/cities/${encodeURIComponent(r.id)}`, 'weekly', 0.6, r.updated_at ? new Date(r.updated_at) : now),
  );

  return [...staticEntries, ...eventEntries, ...artistEntries, ...venueEntries, ...cityEntries];
}
