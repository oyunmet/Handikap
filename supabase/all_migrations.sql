-- Consolidated, idempotent Supabase migrations.
-- Keep the destructive 002 action commented until its preflight and backup
-- are complete. All other statements below match db/migrations/001 and 003–005.

-- 001: player profiles and duel records.
CREATE TABLE IF NOT EXISTS public.shafak_player_profiles (
  user_id TEXT PRIMARY KEY,
  profile JSONB NOT NULL CHECK (jsonb_typeof(profile) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shafak_duels (
  duel_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  seed BIGINT NOT NULL CHECK (seed > 0 AND seed <= 4294967295),
  opponent_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS shafak_duels_user_started_idx
  ON public.shafak_duels (user_id, started_at DESC);

-- 002: destructive legacy-data removal — intentionally NOT executed here.
-- Confirm the legacy columns exist before running either preflight query:
--
--   SELECT column_name
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name = 'shafak_duels'
--     AND column_name IN ('moves', 'result');
--
-- If both columns exist, count affected rows:
--
--   SELECT COUNT(*) AS legacy_rows
--   FROM public.shafak_duels
--   WHERE moves IS NOT NULL OR result IS NOT NULL;
--
-- If legacy_rows > 0, export and verify this result as CSV or JSON before
-- proceeding:
--
--   SELECT duel_id, user_id, moves, result
--   FROM public.shafak_duels
--   WHERE moves IS NOT NULL OR result IS NOT NULL;
--
-- Only after a verified backup, run this separately and manually:
-- ALTER TABLE public.shafak_duels
--   DROP COLUMN IF EXISTS moves,
--   DROP COLUMN IF EXISTS result;

-- 003: persistent pickup claims.
CREATE TABLE IF NOT EXISTS public.shafak_pickup_claims (
  user_id TEXT NOT NULL,
  chapter_id INTEGER NOT NULL CHECK (chapter_id >= 0 AND chapter_id <= 1000000),
  pickup_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pickup_id)
);

CREATE INDEX IF NOT EXISTS shafak_pickup_claims_user_chapter_idx
  ON public.shafak_pickup_claims (user_id, chapter_id);

-- 004: server-verified duel inputs and completion data.
ALTER TABLE public.shafak_duels
  ADD COLUMN IF NOT EXISTS input_log JSONB,
  ADD COLUMN IF NOT EXISTS completion JSONB;

-- 005: duel player stats and idempotent store transactions.
ALTER TABLE public.shafak_duels
  ADD COLUMN IF NOT EXISTS player_stats JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.shafak_store_transactions (
  user_id TEXT NOT NULL,
  idempotency_key UUID NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('purchase', 'upgrade')),
  item_id TEXT NOT NULL,
  response JSONB NOT NULL CHECK (jsonb_typeof(response) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS shafak_store_transactions_created_idx
  ON public.shafak_store_transactions (created_at);
