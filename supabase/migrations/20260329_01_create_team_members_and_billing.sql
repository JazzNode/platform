-- ============================================================
-- Team Members table + billing_user_id for multi-manager support
-- ============================================================

-- 1. Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('artist', 'venue')),
  entity_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'removed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_one_owner
  ON public.team_members (entity_type, entity_id)
  WHERE role = 'owner' AND status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_team_members_entity ON public.team_members (entity_type, entity_id) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members (user_id) WHERE status != 'removed';

-- 2. Add billing_user_id
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS billing_user_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS billing_user_id uuid REFERENCES public.profiles(id);

-- 3. RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team memberships"
  ON public.team_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Team members can view co-members"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.entity_type = team_members.entity_type
        AND tm.entity_id = team_members.entity_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'accepted'
    )
  );

CREATE POLICY "Owner and admin can invite team members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.entity_type = entity_type
        AND tm.entity_id = entity_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'accepted'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owner and admin can update team members"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.entity_type = team_members.entity_type
        AND tm.entity_id = team_members.entity_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'accepted'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can accept own invitations"
  ON public.team_members FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Platform admins full access to team_members"
  ON public.team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- 4. Backfill
INSERT INTO public.team_members (entity_type, entity_id, user_id, role, status, created_at)
SELECT DISTINCT ON (c.target_type, c.target_id)
  c.target_type, c.target_id, c.user_id, 'owner', 'accepted',
  COALESCE(c.reviewed_at, c.submitted_at, now())
FROM public.claims c
WHERE c.status = 'approved'
ORDER BY c.target_type, c.target_id, c.reviewed_at ASC NULLS LAST
ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING;

INSERT INTO public.team_members (entity_type, entity_id, user_id, role, status, created_at)
SELECT c.target_type, c.target_id, c.user_id, 'admin', 'accepted',
  COALESCE(c.reviewed_at, c.submitted_at, now())
FROM public.claims c
WHERE c.status = 'approved'
ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING;

INSERT INTO public.team_members (entity_type, entity_id, user_id, role, status, created_at)
SELECT DISTINCT 'venue', unnest(p.claimed_venue_ids), p.id, 'admin', 'accepted', now()
FROM public.profiles p
WHERE p.claimed_venue_ids IS NOT NULL AND array_length(p.claimed_venue_ids, 1) > 0
ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING;

INSERT INTO public.team_members (entity_type, entity_id, user_id, role, status, created_at)
SELECT DISTINCT 'artist', unnest(p.claimed_artist_ids), p.id, 'admin', 'accepted', now()
FROM public.profiles p
WHERE p.claimed_artist_ids IS NOT NULL AND array_length(p.claimed_artist_ids, 1) > 0
ON CONFLICT (entity_type, entity_id, user_id) DO NOTHING;

UPDATE public.artists a SET billing_user_id = sub.user_id
FROM (
  SELECT DISTINCT ON (target_id) target_id, user_id
  FROM public.claims WHERE target_type = 'artist' AND status = 'approved'
  ORDER BY target_id, reviewed_at ASC NULLS LAST
) sub
WHERE sub.target_id = a.artist_id AND a.billing_user_id IS NULL;

UPDATE public.venues v SET billing_user_id = sub.user_id
FROM (
  SELECT DISTINCT ON (target_id) target_id, user_id
  FROM public.claims WHERE target_type = 'venue' AND status = 'approved'
  ORDER BY target_id, reviewed_at ASC NULLS LAST
) sub
WHERE sub.target_id = v.venue_id AND v.billing_user_id IS NULL;

-- 5. Updated trigger
CREATE OR REPLACE FUNCTION public.sync_claim_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    IF NEW.target_type = 'artist' THEN
      UPDATE public.profiles
      SET claimed_artist_ids = array_append(array_remove(claimed_artist_ids, NEW.target_id), NEW.target_id),
          role = CASE WHEN role = 'member' THEN 'artist_manager' ELSE role END,
          updated_at = now()
      WHERE id = NEW.user_id;
      UPDATE public.artists SET billing_user_id = NEW.user_id
      WHERE artist_id = NEW.target_id AND billing_user_id IS NULL;
    ELSIF NEW.target_type = 'venue' THEN
      UPDATE public.profiles
      SET claimed_venue_ids = array_append(array_remove(claimed_venue_ids, NEW.target_id), NEW.target_id),
          role = CASE WHEN role = 'member' THEN 'venue_manager' ELSE role END,
          updated_at = now()
      WHERE id = NEW.user_id;
      UPDATE public.venues SET billing_user_id = NEW.user_id
      WHERE venue_id = NEW.target_id AND billing_user_id IS NULL;
    END IF;

    INSERT INTO public.team_members (entity_type, entity_id, user_id, role, status, created_at)
    VALUES (
      NEW.target_type, NEW.target_id, NEW.user_id,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.team_members
        WHERE entity_type = NEW.target_type AND entity_id = NEW.target_id
          AND role = 'owner' AND status = 'accepted'
      ) THEN 'admin' ELSE 'owner' END,
      'accepted', now()
    )
    ON CONFLICT (entity_type, entity_id, user_id)
    DO UPDATE SET status = 'accepted', updated_at = now();
  END IF;

  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    IF OLD.target_type = 'artist' THEN
      UPDATE public.profiles SET claimed_artist_ids = array_remove(claimed_artist_ids, OLD.target_id), updated_at = now()
      WHERE id = OLD.user_id;
    ELSIF OLD.target_type = 'venue' THEN
      UPDATE public.profiles SET claimed_venue_ids = array_remove(claimed_venue_ids, OLD.target_id), updated_at = now()
      WHERE id = OLD.user_id;
    END IF;

    UPDATE public.profiles SET role = 'member', updated_at = now()
    WHERE id = OLD.user_id
      AND (claimed_artist_ids IS NULL OR array_length(claimed_artist_ids, 1) IS NULL)
      AND (claimed_venue_ids IS NULL OR array_length(claimed_venue_ids, 1) IS NULL)
      AND role IN ('artist_manager', 'venue_manager');

    UPDATE public.team_members SET status = 'removed', updated_at = now()
    WHERE entity_type = OLD.target_type AND entity_id = OLD.target_id AND user_id = OLD.user_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.claims
      WHERE target_type = OLD.target_type AND target_id = OLD.target_id
        AND status = 'approved' AND id != OLD.id
    ) THEN
      IF OLD.target_type = 'artist' THEN
        UPDATE public.artists SET verification_status = 'Unverified', tier = 0 WHERE artist_id = OLD.target_id;
      ELSIF OLD.target_type = 'venue' THEN
        UPDATE public.venues SET verification_status = 'Unverified', tier = 0 WHERE venue_id = OLD.target_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
