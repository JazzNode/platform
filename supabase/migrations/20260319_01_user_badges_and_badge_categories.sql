-- =============================================================================
-- User Badges System: junction table + badge categorization
-- =============================================================================

-- 1. Create user_badges junction table
-- Stores which badges each user has earned, with timestamp for "most recent" display.
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned ON public.user_badges(earned_at DESC);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS: publicly readable (consistent with artist_badges / venue_badges)
CREATE POLICY "User badges are publicly viewable"
  ON public.user_badges FOR SELECT USING (true);

-- RLS: authenticated users can insert their own badges (client-side badge check)
CREATE POLICY "Users can insert own badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Add categorization columns to badges table
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS criteria_target integer;

-- 3. Update existing badge records with category/target_type
UPDATE public.badges SET category = 'recognition', target_type = 'artist', sort_order = 1 WHERE badge_id LIKE 'art_%';
UPDATE public.badges SET category = 'venue_excellence', target_type = 'venue', sort_order = 1 WHERE badge_id LIKE 'ven_%';
UPDATE public.badges SET category = 'milestone', target_type = 'user', sort_order = 1, criteria_target = 10 WHERE badge_id = 'usr_super_fan';
UPDATE public.badges SET category = 'milestone', target_type = 'user', sort_order = 2, criteria_target = 5 WHERE badge_id = 'usr_scene_scout';

-- 4. Insert new user badges (6 languages)
INSERT INTO public.badges (badge_id, category, target_type, sort_order, criteria_target,
  name_en, name_zh, name_ja, name_ko, name_th, name_id,
  description_en, description_zh, description_ja, description_ko, description_th, description_id)
VALUES
  -- Milestones
  ('usr_first_follow', 'milestone', 'user', 0, 1,
   'First Follow', '初次追蹤', 'はじめてのフォロー', '첫 팔로우', 'ติดตามครั้งแรก', 'Pengikut Pertama',
   'Follow your first artist or venue', '追蹤你的第一位藝人或場地', '初めてのアーティストまたは会場をフォロー', '첫 번째 아티스트 또는 공연장을 팔로우하세요', 'ติดตามศิลปินหรือสถานที่แรกของคุณ', 'Ikuti artis atau tempat pertama Anda'),

  ('usr_city_explorer', 'milestone', 'user', 3, 3,
   'City Explorer', '城市探索家', 'シティエクスプローラー', '도시 탐험가', 'นักสำรวจเมือง', 'Penjelajah Kota',
   'Follow artists or venues in 3+ cities', '追蹤 3 個以上不同城市的藝人或場地', '3つ以上の都市のアーティストまたは会場をフォロー', '3개 이상 도시의 아티스트 또는 공연장을 팔로우하세요', 'ติดตามศิลปินหรือสถานที่ใน 3 เมืองขึ้นไป', 'Ikuti artis atau tempat di 3+ kota'),

  ('usr_night_owl', 'milestone', 'user', 4, 5,
   'Night Owl', '夜貓子', 'ナイトオウル', '올빼미', 'นกฮูกกลางคืน', 'Burung Hantu Malam',
   'Bookmark 5+ events starting after 10 PM', '收藏 5 場以上晚間 10 點後的演出', '22時以降のイベントを5件以上ブックマーク', '밤 10시 이후 시작하는 이벤트 5개 이상 즐겨찾기', 'บุ๊คมาร์คอีเวนต์หลัง 4 ทุ่ม 5 รายการขึ้นไป', 'Tandai 5+ acara yang dimulai setelah pukul 22.00'),

  -- Community
  ('usr_profile_complete', 'community', 'user', 10, NULL,
   'Profile Pro', '個人檔案達人', 'プロフィールマスター', '프로필 달인', 'โปรไฟล์โปร', 'Profil Pro',
   'Complete your profile (name, bio, avatar, website)', '完成你的個人資料（名稱、簡介、頭像、網站）', 'プロフィールを完成させる（名前、自己紹介、アバター、ウェブサイト）', '프로필을 완성하세요 (이름, 소개, 아바타, 웹사이트)', 'กรอกโปรไฟล์ให้ครบ (ชื่อ, ไบโอ, รูปโปรไฟล์, เว็บไซต์)', 'Lengkapi profil Anda (nama, bio, avatar, website)'),

  ('usr_first_message', 'community', 'user', 11, 1,
   'Icebreaker', '破冰者', 'アイスブレイカー', '아이스브레이커', 'ผู้ทำลายน้ำแข็ง', 'Pemecah Es',
   'Send your first message', '發送你的第一則訊息', '初めてのメッセージを送信', '첫 번째 메시지를 보내세요', 'ส่งข้อความแรกของคุณ', 'Kirim pesan pertama Anda'),

  ('usr_social_butterfly', 'community', 'user', 12, 3,
   'Social Butterfly', '社交蝴蝶', 'ソーシャルバタフライ', '소셜 버터플라이', 'ผีเสื้อสังคม', 'Kupu-kupu Sosial',
   'Participate in 3+ conversations', '參與 3 場以上的對話', '3つ以上の会話に参加', '3개 이상의 대화에 참여하세요', 'มีส่วนร่วมในการสนทนา 3 ครั้งขึ้นไป', 'Berpartisipasi dalam 3+ percakapan')
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
