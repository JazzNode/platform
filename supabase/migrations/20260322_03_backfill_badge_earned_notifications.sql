-- Backfill badge_earned notifications for all existing artist badges
INSERT INTO public.notifications (user_id, title, body, type, reference_type, reference_id, status, created_at)
SELECT
  p.id,
  '🏆 獲得新成就',
  COALESCE(b.name_zh, b.name_en, ab.badge_id),
  'badge_earned',
  'artist',
  ab.artist_id,
  'sent',
  ab.earned_at
FROM public.artist_badges ab
JOIN public.badges b ON b.badge_id = ab.badge_id
JOIN public.profiles p ON ab.artist_id = ANY(p.claimed_artist_ids)
WHERE NOT EXISTS (
  -- Skip if notification already exists (idempotent)
  SELECT 1 FROM public.notifications n
  WHERE n.user_id = p.id
    AND n.type = 'badge_earned'
    AND n.reference_type = 'artist'
    AND n.reference_id = ab.artist_id
    AND n.body = COALESCE(b.name_zh, b.name_en, ab.badge_id)
);

-- Backfill badge_earned notifications for all existing venue badges
INSERT INTO public.notifications (user_id, title, body, type, reference_type, reference_id, status, created_at)
SELECT
  p.id,
  '🏆 獲得新成就',
  COALESCE(b.name_zh, b.name_en, vb.badge_id),
  'badge_earned',
  'venue',
  vb.venue_id,
  'sent',
  vb.earned_at
FROM public.venue_badges vb
JOIN public.badges b ON b.badge_id = vb.badge_id
JOIN public.profiles p ON vb.venue_id = ANY(p.claimed_venue_ids)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notifications n
  WHERE n.user_id = p.id
    AND n.type = 'badge_earned'
    AND n.reference_type = 'venue'
    AND n.reference_id = vb.venue_id
    AND n.body = COALESCE(b.name_zh, b.name_en, vb.badge_id)
);
