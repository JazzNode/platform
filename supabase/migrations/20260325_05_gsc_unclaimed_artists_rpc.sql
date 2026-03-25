-- High-impression unclaimed artists: GSC data × artists × claims
CREATE OR REPLACE FUNCTION gsc_unclaimed_artists(start_date date, end_date date, row_limit int DEFAULT 20)
RETURNS TABLE(
  artist_id text,
  display_name text,
  name_en text,
  name_local text,
  photo_url text,
  country_code text,
  total_impressions bigint,
  total_clicks bigint,
  avg_position real,
  top_query text
)
LANGUAGE sql STABLE AS $$
  WITH artist_gsc AS (
    SELECT
      regexp_replace(page, '^https?://[^/]+/[a-z]{2}/artists/', '') as slug,
      sum(impressions) as total_impressions,
      sum(clicks) as total_clicks,
      avg(position)::real as avg_position
    FROM gsc_search_analytics
    WHERE date >= start_date AND date < end_date
      AND page LIKE '%/artists/%'
    GROUP BY 1
  ),
  top_queries AS (
    SELECT DISTINCT ON (regexp_replace(page, '^https?://[^/]+/[a-z]{2}/artists/', ''))
      regexp_replace(page, '^https?://[^/]+/[a-z]{2}/artists/', '') as slug,
      query as top_query
    FROM gsc_search_analytics
    WHERE date >= start_date AND date < end_date
      AND page LIKE '%/artists/%'
      AND query != ''
    ORDER BY regexp_replace(page, '^https?://[^/]+/[a-z]{2}/artists/', ''), impressions DESC
  )
  SELECT
    a.artist_id,
    a.display_name,
    a.name_en,
    a.name_local,
    a.photo_url,
    a.country_code,
    g.total_impressions,
    g.total_clicks,
    g.avg_position,
    coalesce(tq.top_query, '') as top_query
  FROM artist_gsc g
  INNER JOIN artists a ON a.artist_id = g.slug
  LEFT JOIN claims c ON c.target_type = 'artist' AND c.target_id = g.slug AND c.status = 'approved'
  LEFT JOIN top_queries tq ON tq.slug = g.slug
  WHERE c.target_id IS NULL  -- NOT claimed
  ORDER BY g.total_impressions DESC
  LIMIT row_limit;
$$;
