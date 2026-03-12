-- profiles 加快取欄位，claim approved 時由 trigger 自動維護
ALTER TABLE public.profiles
  ADD COLUMN claimed_artist_ids text[] DEFAULT '{}';

COMMENT ON COLUMN public.profiles.claimed_artist_ids IS
  '已通過 claim 的 artist_id 列表（快取）。claim approved 時由 trigger 自動維護。前端用此欄位判斷編輯權限，不需每次 join claims 表。';
