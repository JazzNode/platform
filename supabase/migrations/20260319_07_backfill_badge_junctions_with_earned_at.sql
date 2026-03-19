-- Backfill venue_badges and artist_badges with historically computed earned_at
-- Uses event dates to determine when each badge's criteria was first met

-- ven_artist_magnet: date of 10th distinct artist's first event at venue
INSERT INTO venue_badges (venue_id, badge_id, earned_at)
SELECT venue_id, 'ven_artist_magnet', earned_at FROM (
  WITH venue_artist_events AS (
    SELECT DISTINCT e.venue_id, l.artist_id, MIN(e.start_at) as first_event
    FROM events e
    JOIN lineups l ON l.event_id = e.event_id
    WHERE e.venue_id IS NOT NULL AND l.artist_id IS NOT NULL AND e.start_at IS NOT NULL
    GROUP BY e.venue_id, l.artist_id
  ),
  ranked AS (
    SELECT venue_id, first_event as earned_at,
      ROW_NUMBER() OVER (PARTITION BY venue_id ORDER BY first_event) as rn
    FROM venue_artist_events
  )
  SELECT venue_id, earned_at FROM ranked WHERE rn = 10
) sub
ON CONFLICT (venue_id, badge_id) DO UPDATE SET earned_at = EXCLUDED.earned_at;

-- ven_marathon: date of 20th event at venue
INSERT INTO venue_badges (venue_id, badge_id, earned_at)
SELECT venue_id, 'ven_marathon', earned_at FROM (
  WITH venue_events_ranked AS (
    SELECT venue_id, start_at as earned_at,
      ROW_NUMBER() OVER (PARTITION BY venue_id ORDER BY start_at) as rn
    FROM events
    WHERE venue_id IS NOT NULL AND start_at IS NOT NULL
  )
  SELECT venue_id, earned_at FROM venue_events_ranked WHERE rn = 20
) sub
ON CONFLICT (venue_id, badge_id) DO UPDATE SET earned_at = EXCLUDED.earned_at;

-- ven_multilingual: venues with 2+ friendly languages (static, use created_at)
INSERT INTO venue_badges (venue_id, badge_id, earned_at)
SELECT venue_id, 'ven_multilingual', created_at
FROM venues
WHERE (CASE WHEN friendly_en THEN 1 ELSE 0 END +
       CASE WHEN friendly_ja THEN 1 ELSE 0 END +
       CASE WHEN friendly_ko THEN 1 ELSE 0 END +
       CASE WHEN friendly_th THEN 1 ELSE 0 END +
       CASE WHEN friendly_id THEN 1 ELSE 0 END) >= 2
ON CONFLICT (venue_id, badge_id) DO UPDATE SET earned_at = EXCLUDED.earned_at;

-- art_bandleader: date of 3rd bandleader lineup
INSERT INTO artist_badges (artist_id, badge_id, earned_at)
SELECT artist_id, 'art_bandleader', earned_at FROM (
  WITH artist_bl_events AS (
    SELECT l.artist_id, e.start_at as earned_at,
      ROW_NUMBER() OVER (PARTITION BY l.artist_id ORDER BY e.start_at) as rn
    FROM lineups l
    JOIN events e ON e.event_id = l.event_id
    WHERE l.role = 'bandleader' AND e.start_at IS NOT NULL
  )
  SELECT artist_id, earned_at FROM artist_bl_events WHERE rn = 3
) sub
ON CONFLICT (artist_id, badge_id) DO UPDATE SET earned_at = EXCLUDED.earned_at;

-- art_multi_instrumentalist: artists with 3+ instruments (static, use created_at)
INSERT INTO artist_badges (artist_id, badge_id, earned_at)
SELECT artist_id, 'art_multi_instrumentalist', created_at
FROM artists
WHERE array_length(instrument_list, 1) >= 3
ON CONFLICT (artist_id, badge_id) DO UPDATE SET earned_at = EXCLUDED.earned_at;
