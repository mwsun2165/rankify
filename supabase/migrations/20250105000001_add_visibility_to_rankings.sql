-- Add multi-level visibility to rankings
-- Up migration

BEGIN;

-- 1. Add visibility column with default 'public'
ALTER TABLE public.rankings
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- 2. Back-fill visibility based on previous is_public boolean (if the column still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'rankings'
      AND column_name  = 'is_public'
  ) THEN
    UPDATE public.rankings
    SET visibility = CASE WHEN is_public THEN 'public' ELSE 'private' END;
  END IF;
END $$;

-- 3. Drop existing policies that reference the old column
DROP POLICY IF EXISTS "Public rankings are viewable by everyone" ON public.rankings;
DROP POLICY IF EXISTS "Ranking items viewable based on ranking visibility" ON public.ranking_items;
DROP POLICY IF EXISTS "Comments viewable on visible rankings" ON public.ranking_comments;

-- 4. Ensure visibility constraint (drop first if it already exists)
ALTER TABLE public.rankings
  DROP CONSTRAINT IF EXISTS rankings_visibility_check;
ALTER TABLE public.rankings
  ADD CONSTRAINT rankings_visibility_check
  CHECK (visibility IN ('public','friends','private'));

-- 5. Drop legacy is_public column (now safe because dependent policies are gone)
ALTER TABLE public.rankings
  DROP COLUMN IF EXISTS is_public;

-- 6. Re-create policies using visibility column
CREATE POLICY "Public rankings are viewable by everyone" ON public.rankings
    FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Ranking items viewable based on ranking visibility" ON public.ranking_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rankings r
            WHERE r.id = ranking_items.ranking_id
              AND (r.visibility = 'public' OR r.user_id = auth.uid())
        )
    );

-- Comments table still references ranking_id; its visibility logic depends on parent ranking visibility
CREATE POLICY "Comments viewable on visible rankings" ON public.ranking_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rankings r
            WHERE r.id = ranking_comments.ranking_id
              AND (r.visibility = 'public' OR r.user_id = auth.uid())
        )
    );

COMMIT;
