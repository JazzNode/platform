-- genres 欄位無資料且風格定義有爭議，移除
ALTER TABLE public.artists DROP COLUMN IF EXISTS genres;
