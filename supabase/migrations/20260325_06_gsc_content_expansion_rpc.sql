-- Content expansion analysis: page_type × country cross-analysis
-- Identifies high-demand low-coverage opportunities for content expansion
CREATE OR REPLACE FUNCTION gsc_content_expansion(start_date date, end_date date)
RETURNS TABLE(
  page_type text,
  country text,
  impressions bigint,
  clicks bigint,
  avg_ctr real,
  avg_position real,
  page_count bigint
)
LANGUAGE sql STABLE AS $$
  SELECT
    CASE
      WHEN page LIKE '%/artists/%' THEN 'artist'
      WHEN page LIKE '%/venues/%' THEN 'venue'
      WHEN page LIKE '%/events/%' THEN 'event'
      WHEN page LIKE '%/magazine/%' THEN 'magazine'
      ELSE 'other'
    END as page_type,
    country,
    sum(impressions)::bigint as impressions,
    sum(clicks)::bigint as clicks,
    (CASE WHEN sum(impressions) > 0 THEN sum(clicks)::real / sum(impressions)::real ELSE 0 END)::real as avg_ctr,
    avg(position)::real as avg_position,
    count(DISTINCT page)::bigint as page_count
  FROM gsc_search_analytics
  WHERE date >= start_date AND date < end_date
    AND page != '' AND country != ''
  GROUP BY 1, 2
  HAVING sum(impressions) >= 1
  ORDER BY sum(impressions) DESC;
$$;
