-- Extend rankings table to store pool items and ranking source context

BEGIN;

-- Array of item ids that were in the pool when ranking was saved
ALTER TABLE public.rankings
  ADD COLUMN IF NOT EXISTS pool_item_ids text[] DEFAULT '{}'::text[];

-- Optional context that the ranking is derived from (e.g. albums of an artist or songs of an album)
ALTER TABLE public.rankings
  ADD COLUMN IF NOT EXISTS source_type text CHECK (source_type IN ('artist','album'));

ALTER TABLE public.rankings
  ADD COLUMN IF NOT EXISTS source_id text;

COMMIT;
