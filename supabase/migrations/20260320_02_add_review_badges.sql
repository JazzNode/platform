-- Add user badges for venue review milestones.

INSERT INTO public.badges (badge_id, category, target_type, sort_order, criteria_target,
  name_en, name_zh, name_ja, name_ko, name_th, name_id,
  description_en, description_zh, description_ja, description_ko, description_th, description_id)
VALUES
  ('usr_first_review', 'community', 'user', 13, 1,
   'First Review', '初次評論', 'はじめてのレビュー', '첫 리뷰', 'รีวิวแรก', 'Ulasan Pertama',
   'Leave your first venue review', '留下你的第一個場地評論', '初めての会場レビューを書く', '첫 번째 공연장 리뷰를 남기세요', 'เขียนรีวิวสถานที่แรกของคุณ', 'Tulis ulasan tempat pertama Anda'),

  ('usr_scene_critic', 'community', 'user', 14, 5,
   'Scene Critic', '樂評人', 'シーンクリティック', '씬 크리틱', 'นักวิจารณ์', 'Kritikus Musik',
   'Review 5 or more venues', '評論 5 個以上場地', '5つ以上の会場をレビュー', '5개 이상 공연장을 리뷰하세요', 'เขียนรีวิวสถานที่ 5 แห่งขึ้นไป', 'Beri ulasan 5 tempat atau lebih')
ON CONFLICT (badge_id) DO UPDATE SET
  category = EXCLUDED.category,
  target_type = EXCLUDED.target_type,
  sort_order = EXCLUDED.sort_order,
  criteria_target = EXCLUDED.criteria_target,
  name_en = EXCLUDED.name_en, name_zh = EXCLUDED.name_zh,
  name_ja = EXCLUDED.name_ja, name_ko = EXCLUDED.name_ko,
  name_th = EXCLUDED.name_th, name_id = EXCLUDED.name_id,
  description_en = EXCLUDED.description_en, description_zh = EXCLUDED.description_zh,
  description_ja = EXCLUDED.description_ja, description_ko = EXCLUDED.description_ko,
  description_th = EXCLUDED.description_th, description_id = EXCLUDED.description_id;
