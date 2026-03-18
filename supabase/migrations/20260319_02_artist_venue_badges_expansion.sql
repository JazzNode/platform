-- =============================================================================
-- Artist & Venue Badges Expansion
-- Updates existing badges + adds 8 new badges (4 artist, 4 venue)
-- =============================================================================

-- 1a. Update existing artist badges criteria_target + sort_order
UPDATE public.badges SET sort_order=0, criteria_target=8  WHERE badge_id='art_gig_warrior';
UPDATE public.badges SET sort_order=1, criteria_target=NULL WHERE badge_id='art_local_hero';
UPDATE public.badges SET sort_order=2, criteria_target=3  WHERE badge_id='art_globetrotter';
UPDATE public.badges SET sort_order=7, criteria_target=NULL WHERE badge_id='art_in_the_house';
UPDATE public.badges SET sort_order=8, criteria_target=NULL WHERE badge_id='art_accepting_students';

-- 1a. Update existing venue badges
UPDATE public.badges SET sort_order=0, criteria_target=NULL WHERE badge_id='ven_jazz_hub';
UPDATE public.badges SET sort_order=1, criteria_target=5  WHERE badge_id='ven_genre_explorer';
UPDATE public.badges SET sort_order=2, criteria_target=NULL WHERE badge_id='ven_crowd_magnet';
UPDATE public.badges SET sort_order=7, criteria_target=NULL WHERE badge_id='ven_house_keys';

-- 1b. New artist badges (6 languages)
INSERT INTO public.badges (badge_id, category, target_type, sort_order, criteria_target,
  name_en, name_zh, name_ja, name_ko, name_th, name_id,
  description_en, description_zh, description_ja, description_ko, description_th, description_id)
VALUES
  ('art_bandleader', 'recognition', 'artist', 3, 3,
   'Bandleader', '樂團領袖', 'バンドリーダー', '밴드리더', 'หัวหน้าวง', 'Pemimpin Band',
   'Lead 3+ performances as bandleader', '以樂團領袖身分帶領 3 場以上演出', 'バンドリーダーとして3回以上の公演をリード', '밴드리더로 3회 이상 공연을 이끌다', 'นำวง 3 ครั้งขึ้นไปในฐานะหัวหน้าวง', 'Memimpin 3+ pertunjukan sebagai pemimpin band'),

  ('art_versatile', 'recognition', 'artist', 4, 3,
   'Versatile', '百變樂手', 'バーサタイル', '다재다능', 'นักดนตรีรอบด้าน', 'Serba Bisa',
   'Perform in 3+ different roles', '以 3 種以上不同角色演出', '3つ以上の異なる役割で演奏', '3가지 이상의 다른 역할로 공연', 'เล่นใน 3 บทบาทที่แตกต่างกันขึ้นไป', 'Tampil dalam 3+ peran berbeda'),

  ('art_fan_favorite', 'recognition', 'artist', 5, NULL,
   'Fan Favorite', '人氣之星', 'ファンのお気に入り', '팬 페이보릿', 'ขวัญใจแฟนเพลง', 'Favorit Penggemar',
   'Top 10% most followed artists', '追蹤數排名前 10% 的藝人', 'フォロワー数トップ10%のアーティスト', '팔로워 수 상위 10% 아티스트', 'ศิลปินที่มีผู้ติดตามสูงสุด 10%', 'Artis dengan pengikut terbanyak 10% teratas'),

  ('art_multi_instrumentalist', 'recognition', 'artist', 6, 3,
   'Multi-Instrumentalist', '多樂器大師', 'マルチ奏者', '멀티 연주자', 'นักดนตรีหลายเครื่อง', 'Multi-Instrumentalis',
   'Play 3+ different instruments', '演奏 3 種以上不同樂器', '3つ以上の異なる楽器を演奏', '3가지 이상의 악기를 연주', 'เล่นเครื่องดนตรี 3 ชนิดขึ้นไป', 'Memainkan 3+ instrumen berbeda')
ON CONFLICT (badge_id) DO UPDATE SET
  category = EXCLUDED.category, target_type = EXCLUDED.target_type,
  sort_order = EXCLUDED.sort_order, criteria_target = EXCLUDED.criteria_target,
  name_en = EXCLUDED.name_en, name_zh = EXCLUDED.name_zh, name_ja = EXCLUDED.name_ja,
  name_ko = EXCLUDED.name_ko, name_th = EXCLUDED.name_th, name_id = EXCLUDED.name_id,
  description_en = EXCLUDED.description_en, description_zh = EXCLUDED.description_zh,
  description_ja = EXCLUDED.description_ja, description_ko = EXCLUDED.description_ko,
  description_th = EXCLUDED.description_th, description_id = EXCLUDED.description_id;

-- 1c. New venue badges (6 languages)
INSERT INTO public.badges (badge_id, category, target_type, sort_order, criteria_target,
  name_en, name_zh, name_ja, name_ko, name_th, name_id,
  description_en, description_zh, description_ja, description_ko, description_th, description_id)
VALUES
  ('ven_artist_magnet', 'venue_excellence', 'venue', 3, 10,
   'Artist Magnet', '藝人磁鐵', 'アーティストマグネット', '아티스트 자석', 'แม่เหล็กศิลปิน', 'Magnet Artis',
   'Host 10+ different artists', '邀請 10 位以上不同藝人演出', '10人以上の異なるアーティストを招聘', '10명 이상의 다른 아티스트를 초대', 'เชิญศิลปิน 10 คนขึ้นไปมาแสดง', 'Mengundang 10+ artis berbeda'),

  ('ven_world_stage', 'venue_excellence', 'venue', 4, 3,
   'World Stage', '國際舞台', 'ワールドステージ', '세계 무대', 'เวทีโลก', 'Panggung Dunia',
   'Host artists from 3+ countries', '邀請來自 3 個以上國家的藝人', '3カ国以上のアーティストを招聘', '3개국 이상의 아티스트를 초대', 'เชิญศิลปินจาก 3 ประเทศขึ้นไป', 'Mengundang artis dari 3+ negara'),

  ('ven_multilingual', 'venue_excellence', 'venue', 5, 2,
   'Multilingual', '多語言友善', '多言語対応', '다국어 지원', 'หลายภาษา', 'Multibahasa',
   'Communicate in 2+ foreign languages', '支援 2 種以上外語溝通', '2つ以上の外国語に対応', '2개 이상의 외국어로 소통', 'สื่อสารได้ 2 ภาษาต่างประเทศขึ้นไป', 'Berkomunikasi dalam 2+ bahasa asing'),

  ('ven_marathon', 'venue_excellence', 'venue', 6, 20,
   'Marathon Stage', '演出馬拉松', 'マラソンステージ', '마라톤 스테이지', 'เวทีมาราธอน', 'Panggung Maraton',
   'Host 20+ events in total', '總共舉辦 20 場以上活動', '合計20回以上のイベントを開催', '총 20회 이상의 이벤트를 개최', 'จัดอีเวนต์รวม 20 ครั้งขึ้นไป', 'Menyelenggarakan 20+ acara secara total')
ON CONFLICT (badge_id) DO UPDATE SET
  category = EXCLUDED.category, target_type = EXCLUDED.target_type,
  sort_order = EXCLUDED.sort_order, criteria_target = EXCLUDED.criteria_target,
  name_en = EXCLUDED.name_en, name_zh = EXCLUDED.name_zh, name_ja = EXCLUDED.name_ja,
  name_ko = EXCLUDED.name_ko, name_th = EXCLUDED.name_th, name_id = EXCLUDED.name_id,
  description_en = EXCLUDED.description_en, description_zh = EXCLUDED.description_zh,
  description_ja = EXCLUDED.description_ja, description_ko = EXCLUDED.description_ko,
  description_th = EXCLUDED.description_th, description_id = EXCLUDED.description_id;
