-- GSC Dashboard RPC functions for SEO analytics

-- Period totals
CREATE OR REPLACE FUNCTION gsc_period_totals(start_date date, end_date date)
RETURNS TABLE(total_clicks bigint, total_impressions bigint, avg_ctr real, avg_position real)
LANGUAGE sql STABLE AS $$
  SELECT
    coalesce(sum(clicks), 0)::bigint,
    coalesce(sum(impressions), 0)::bigint,
    coalesce(avg(ctr), 0)::real,
    coalesce(avg(position), 0)::real
  FROM gsc_search_analytics
  WHERE date >= start_date AND date < end_date;
$$;

-- Top queries by impressions
CREATE OR REPLACE FUNCTION gsc_top_queries(start_date date, end_date date, row_limit int DEFAULT 20)
RETURNS TABLE(query text, impressions bigint, clicks bigint, avg_ctr real, avg_position real)
LANGUAGE sql STABLE AS $$
  SELECT
    query,
    sum(impressions)::bigint,
    sum(clicks)::bigint,
    (CASE WHEN sum(impressions) > 0 THEN sum(clicks)::real / sum(impressions)::real ELSE 0 END)::real,
    avg(position)::real
  FROM gsc_search_analytics
  WHERE date >= start_date AND date < end_date AND query != ''
  GROUP BY query
  ORDER BY sum(impressions) DESC
  LIMIT row_limit;
$$;

-- Top pages by impressions
CREATE OR REPLACE FUNCTION gsc_top_pages(start_date date, end_date date, row_limit int DEFAULT 20)
RETURNS TABLE(page text, impressions bigint, clicks bigint, avg_ctr real, avg_position real)
LANGUAGE sql STABLE AS $$
  SELECT
    page,
    sum(impressions)::bigint,
    sum(clicks)::bigint,
    (CASE WHEN sum(impressions) > 0 THEN sum(clicks)::real / sum(impressions)::real ELSE 0 END)::real,
    avg(position)::real
  FROM gsc_search_analytics
  WHERE date >= start_date AND date < end_date AND page != ''
  GROUP BY page
  ORDER BY sum(impressions) DESC
  LIMIT row_limit;
$$;

-- Country breakdown
CREATE OR REPLACE FUNCTION gsc_country_breakdown(start_date date, end_date date)
RETURNS TABLE(country text, impressions bigint, clicks bigint, avg_position real)
LANGUAGE sql STABLE AS $$
  SELECT
    country,
    sum(impressions)::bigint,
    sum(clicks)::bigint,
    avg(position)::real
  FROM gsc_search_analytics
  WHERE date >= start_date AND date < end_date AND country != ''
  GROUP BY country
  ORDER BY sum(impressions) DESC
  LIMIT 15;
$$;

-- Device breakdown
CREATE OR REPLACE FUNCTION gsc_device_breakdown(start_date date, end_date date)
RETURNS TABLE(device text, impressions bigint, clicks bigint, avg_ctr real)
LANGUAGE sql STABLE AS $$
  SELECT
    device,
    sum(impressions)::bigint,
    sum(clicks)::bigint,
    (CASE WHEN sum(impressions) > 0 THEN sum(clicks)::real / sum(impressions)::real ELSE 0 END)::real
  FROM gsc_search_analytics
  WHERE date >= start_date AND date < end_date AND device != ''
  GROUP BY device
  ORDER BY sum(impressions) DESC;
$$;

-- Page type breakdown (artist/venue/event/magazine/other)
CREATE OR REPLACE FUNCTION gsc_page_type_breakdown(start_date date, end_date date)
RETURNS TABLE(page_type text, impressions bigint, clicks bigint, avg_position real)
LANGUAGE sql STABLE AS $$
  SELECT
    CASE
      WHEN page LIKE '%/artists/%' THEN 'artist'
      WHEN page LIKE '%/venues/%' THEN 'venue'
      WHEN page LIKE '%/events/%' THEN 'event'
      WHEN page LIKE '%/magazine/%' THEN 'magazine'
      ELSE 'other'
    END as page_type,
    sum(impressions)::bigint,
    sum(clicks)::bigint,
    avg(position)::real
  FROM gsc_search_analytics
  WHERE date >= start_date AND date < end_date AND page != ''
  GROUP BY 1
  ORDER BY sum(impressions) DESC;
$$;

-- High impression, low CTR pages (optimization opportunities)
CREATE OR REPLACE FUNCTION gsc_high_imp_low_ctr(start_date date, end_date date, row_limit int DEFAULT 10)
RETURNS TABLE(page text, query text, impressions bigint, clicks bigint, ctr real, avg_position real)
LANGUAGE sql STABLE AS $$
  SELECT
    page,
    query,
    sum(impressions)::bigint,
    sum(clicks)::bigint,
    (CASE WHEN sum(impressions) > 0 THEN sum(clicks)::real / sum(impressions)::real ELSE 0 END)::real,
    avg(position)::real
  FROM gsc_search_analytics
  WHERE date >= start_date AND date < end_date
    AND impressions > 0
    AND page != '' AND query != ''
  GROUP BY page, query
  HAVING sum(impressions) >= 2 AND (sum(clicks)::real / sum(impressions)::real) < 0.05
  ORDER BY sum(impressions) DESC
  LIMIT row_limit;
$$;
