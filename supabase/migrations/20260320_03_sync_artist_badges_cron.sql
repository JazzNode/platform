-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Function to sync all computed artist badges into artist_badges junction table
CREATE OR REPLACE FUNCTION public.sync_artist_badges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _now timestamptz := now();
BEGIN
  -- Create temp table with all computed badges
  CREATE TEMP TABLE _computed_badges (
    artist_id text NOT NULL,
    badge_id text NOT NULL
  ) ON COMMIT DROP;

  -- 1. art_in_the_house: tier >= 1
  INSERT INTO _computed_badges (artist_id, badge_id)
  SELECT artist_id, 'art_in_the_house'
  FROM artists WHERE tier >= 1;

  -- 2. art_accepting_students: accepting_students = true
  INSERT INTO _computed_badges (artist_id, badge_id)
  SELECT artist_id, 'art_accepting_students'
  FROM artists WHERE accepting_students = true;

  -- 3. art_local_hero: is_master = true AND country_code = 'TW'
  INSERT INTO _computed_badges (artist_id, badge_id)
  SELECT artist_id, 'art_local_hero'
  FROM artists WHERE is_master = true AND country_code = 'TW';

  -- 4. art_multi_instrumentalist: 3+ instruments
  INSERT INTO _computed_badges (artist_id, badge_id)
  SELECT artist_id, 'art_multi_instrumentalist'
  FROM artists WHERE array_length(instrument_list, 1) >= 3;

  -- 5. art_bandleader: 3+ bandleader performances
  INSERT INTO _computed_badges (artist_id, badge_id)
  SELECT artist_id, 'art_bandleader'
  FROM lineups WHERE role = 'bandleader'
  GROUP BY artist_id HAVING count(*) >= 3;

  -- 6. art_versatile: 3+ distinct roles
  INSERT INTO _computed_badges (artist_id, badge_id)
  SELECT artist_id, 'art_versatile'
  FROM lineups WHERE role IS NOT NULL
  GROUP BY artist_id HAVING count(DISTINCT role) >= 3;

  -- 7. art_gig_warrior: 8+ events in past 90 days
  INSERT INTO _computed_badges (artist_id, badge_id)
  SELECT l.artist_id, 'art_gig_warrior'
  FROM lineups l
  JOIN events e ON e.event_id = l.event_id
  WHERE e.start_at >= (_now - interval '90 days')
  GROUP BY l.artist_id HAVING count(DISTINCT e.event_id) >= 8;

  -- 8. art_globetrotter: performed in 3+ countries
  INSERT INTO _computed_badges (artist_id, badge_id)
  SELECT l.artist_id, 'art_globetrotter'
  FROM lineups l
  JOIN events e ON e.event_id = l.event_id
  JOIN venues v ON v.venue_id = e.venue_id
  WHERE v.country_code IS NOT NULL
  GROUP BY l.artist_id HAVING count(DISTINCT v.country_code) >= 3;

  -- 9. art_fan_favorite: has any followers (simplified; could be top 10%)
  INSERT INTO _computed_badges (artist_id, badge_id)
  SELECT DISTINCT target_id, 'art_fan_favorite'
  FROM follows
  WHERE target_type = 'artist';

  -- Deduplicate
  CREATE TEMP TABLE _unique_badges AS
  SELECT DISTINCT artist_id, badge_id FROM _computed_badges;

  -- Insert new badges (that don't already exist)
  INSERT INTO artist_badges (artist_id, badge_id, earned_at)
  SELECT ub.artist_id, ub.badge_id, _now
  FROM _unique_badges ub
  WHERE NOT EXISTS (
    SELECT 1 FROM artist_badges ab
    WHERE ab.artist_id = ub.artist_id AND ab.badge_id = ub.badge_id
  )
  -- Only insert for valid artist_id and badge_id (FK safety)
  AND EXISTS (SELECT 1 FROM artists a WHERE a.artist_id = ub.artist_id)
  AND EXISTS (SELECT 1 FROM badges b WHERE b.badge_id = ub.badge_id);

  -- Remove badges that are no longer earned
  DELETE FROM artist_badges ab
  WHERE NOT EXISTS (
    SELECT 1 FROM _unique_badges ub
    WHERE ub.artist_id = ab.artist_id AND ub.badge_id = ab.badge_id
  );

  DROP TABLE _unique_badges;
END;
$$;

-- Schedule to run every hour at :17
SELECT cron.schedule(
  'sync-artist-badges',
  '17 * * * *',
  'SELECT public.sync_artist_badges()'
);
