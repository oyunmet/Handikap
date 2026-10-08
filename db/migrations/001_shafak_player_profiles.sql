CREATE TABLE IF NOT EXISTS shafak_player_profiles (
  user_id TEXT PRIMARY KEY,
  profile JSONB NOT NULL CHECK (jsonb_typeof(profile) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
