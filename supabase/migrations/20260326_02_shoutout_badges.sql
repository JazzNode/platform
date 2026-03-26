-- ═══ Shoutout Badges ═══

-- User badges
INSERT INTO public.badges (badge_id, name_en, name_zh, name_ja, name_ko, name_th, name_id, description_en, description_zh, description_ja, description_ko, description_th, description_id, category, target_type, sort_order, criteria_target, is_active)
VALUES
  ('usr_first_shoutout', 'First Shoutout', '首次推薦', '初めての推薦', '첫 번째 추천', 'คำชื่นชมแรก', 'Pujian Pertama', 'Left your first artist shoutout', '留下了第一則藝人推薦', '初めてのアーティスト推薦を残した', '첫 번째 아티스트 추천을 남겼습니다', 'เขียนคำชื่นชมศิลปินครั้งแรก', 'Memberikan pujian artis pertama Anda', 'community', 'user', 60, 1, true),
  ('usr_scene_supporter', 'Scene Supporter', '圈內推手', 'シーンサポーター', '씬 서포터', 'ผู้สนับสนุนวงการ', 'Pendukung Komunitas', 'Left shoutouts for 5 different artists', '給 5 位不同藝人留下推薦', '5人の異なるアーティストに推薦を残した', '5명의 다른 아티스트에게 추천을 남겼습니다', 'เขียนคำชื่นชมให้ศิลปิน 5 คน', 'Memberikan pujian untuk 5 artis berbeda', 'community', 'user', 61, 5, true),
  ('usr_tastemaker', 'Tastemaker', '品味家', 'テイストメーカー', '테이스트메이커', 'ผู้นำเทรนด์', 'Penentu Selera', 'Your shoutout was pinned by an artist', '你的推薦被藝人置頂了', 'あなたの推薦がアーティストにピン留めされた', '당신의 추천이 아티스트에 의해 고정되었습니다', 'คำชื่นชมของคุณถูกปักหมุดโดยศิลปิน', 'Pujian Anda disematkan oleh artis', 'community', 'user', 62, 1, true)
ON CONFLICT (badge_id) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_zh = EXCLUDED.name_zh, name_ja = EXCLUDED.name_ja,
  name_ko = EXCLUDED.name_ko, name_th = EXCLUDED.name_th, name_id = EXCLUDED.name_id,
  description_en = EXCLUDED.description_en, description_zh = EXCLUDED.description_zh,
  description_ja = EXCLUDED.description_ja, description_ko = EXCLUDED.description_ko,
  description_th = EXCLUDED.description_th, description_id = EXCLUDED.description_id,
  category = EXCLUDED.category, target_type = EXCLUDED.target_type,
  sort_order = EXCLUDED.sort_order, criteria_target = EXCLUDED.criteria_target;

-- Artist badges
INSERT INTO public.badges (badge_id, name_en, name_zh, name_ja, name_ko, name_th, name_id, description_en, description_zh, description_ja, description_ko, description_th, description_id, category, target_type, sort_order, criteria_target, is_active)
VALUES
  ('art_crowd_favorite', 'Crowd Favorite', '人氣王', 'ファンの人気者', '관객의 사랑', 'ขวัญใจแฟนเพลง', 'Favorit Penonton', 'Received 5+ shoutouts', '收到 5 則以上推薦', '5件以上の推薦を獲得', '5개 이상의 추천을 받았습니다', 'ได้รับคำชื่นชม 5 ครั้งขึ้นไป', 'Menerima 5+ pujian', 'recognition', 'artist', 50, 5, true),
  ('art_peer_respected', 'Peer Respected', '同行認可', '仲間からの信頼', '동료의 존경', 'เป็นที่ยอมรับ', 'Dihormati Rekan', 'Received 3+ shoutouts from other artists', '收到 3 則以上來自其他藝人的推薦', '他のアーティストから3件以上の推薦', '다른 아티스트로부터 3개 이상의 추천', 'ได้รับคำชื่นชมจากศิลปินอื่น 3 ครั้ง', 'Menerima 3+ pujian dari artis lain', 'recognition', 'artist', 51, 3, true),
  ('art_venue_choice', 'Venue''s Choice', '場地之選', '会場のお気に入り', '베뉴 초이스', 'ตัวเลือกของสถานที่', 'Pilihan Venue', 'Received shoutouts from 3+ different venues', '收到 3 家以上不同場地的推薦', '3つ以上の異なる会場から推薦を獲得', '3개 이상의 다른 베뉴로부터 추천', 'ได้รับคำชื่นชมจากสถานที่ 3 แห่ง', 'Menerima pujian dari 3+ venue berbeda', 'recognition', 'artist', 52, 3, true)
ON CONFLICT (badge_id) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_zh = EXCLUDED.name_zh, name_ja = EXCLUDED.name_ja,
  name_ko = EXCLUDED.name_ko, name_th = EXCLUDED.name_th, name_id = EXCLUDED.name_id,
  description_en = EXCLUDED.description_en, description_zh = EXCLUDED.description_zh,
  description_ja = EXCLUDED.description_ja, description_ko = EXCLUDED.description_ko,
  description_th = EXCLUDED.description_th, description_id = EXCLUDED.description_id,
  category = EXCLUDED.category, target_type = EXCLUDED.target_type,
  sort_order = EXCLUDED.sort_order, criteria_target = EXCLUDED.criteria_target;
