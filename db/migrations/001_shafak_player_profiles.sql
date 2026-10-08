CREATE TABLE IF NOT EXISTS shafak_player_profiles (
  user_id TEXT PRIMARY KEY,
  profile JSONB NOT NULL CHECK (jsonb_typeof(profile) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shafak_duels (
  duel_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  seed BIGINT NOT NULL CHECK (seed > 0 AND seed <= 4294967295),
  opponent_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  moves JSONB CHECK (moves IS NULL OR jsonb_typeof(moves) = 'array'),
  result JSONB CHECK (result IS NULL OR jsonb_typeof(result) = 'object')
);

CREATE INDEX IF NOT EXISTS shafak_duels_user_started_idx
  ON shafak_duels (user_id, started_at DESC);
