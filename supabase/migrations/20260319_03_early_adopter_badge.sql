-- =============================================================================
-- Early Adopter Badge: "Genesis Node" — limited-time badge for members
-- who joined before 2026-06-01 (end of May 2026).
-- =============================================================================

INSERT INTO public.badges (badge_id, category, target_type, sort_order, criteria_target,
  name_en, name_zh, name_ja, name_ko, name_th, name_id,
  description_en, description_zh, description_ja, description_ko, description_th, description_id)
VALUES
  ('usr_genesis_node', 'milestone', 'user', 5, NULL,
   'The Early Bird (but cooler)', '比早鳥更早的鳥', '早起き鳥（もっとクールな方）', '얼리버드 (근데 더 쿨한)', 'นกที่มาก่อนนกตื่นเช้า', 'Burung Pagi (tapi lebih keren)',
   'You were here before it was cool — joined before June 2026', '你早到連蟲都還沒起床 — 於 2026 年 6 月前加入', 'クールになる前からここにいた — 2026年6月以前に参加', '쿨해지기 전부터 여기 있었음 — 2026년 6월 이전 가입', 'คุณมาก่อนมันจะเท่ — เข้าร่วมก่อนมิถุนายน 2026', 'Kamu di sini sebelum jadi keren — bergabung sebelum Juni 2026')
ON CONFLICT (badge_id) DO UPDATE SET
  category = EXCLUDED.category,
  target_type = EXCLUDED.target_type,
  sort_order = EXCLUDED.sort_order,
  criteria_target = EXCLUDED.criteria_target,
  name_en = EXCLUDED.name_en,
  name_zh = EXCLUDED.name_zh,
  name_ja = EXCLUDED.name_ja,
  name_ko = EXCLUDED.name_ko,
  name_th = EXCLUDED.name_th,
  name_id = EXCLUDED.name_id,
  description_en = EXCLUDED.description_en,
  description_zh = EXCLUDED.description_zh,
  description_ja = EXCLUDED.description_ja,
  description_ko = EXCLUDED.description_ko,
  description_th = EXCLUDED.description_th,
  description_id = EXCLUDED.description_id;
