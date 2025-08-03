-- Allow multiple fixed rankings from the same source by adding a variant identifier

BEGIN;

-- 1. Add column if not exists
ALTER TABLE public.rankings
  ADD COLUMN IF NOT EXISTS source_variant integer NOT NULL DEFAULT 1;

-- 2. Replace existing unique constraints (if any) with variant-aware constraint for fixed rankings
-- First drop previous unique index if it exists
DROP INDEX IF EXISTS uniq_fixed_ranking_per_source;

-- Create new partial unique index that only applies to fixed rankings (source_type is not null)
CREATE UNIQUE INDEX uniq_fixed_ranking_per_source
  ON public.rankings(user_id, source_type, source_id, source_variant)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

COMMIT;
