CREATE TABLE IF NOT EXISTS shafak_pickup_claims (
  user_id TEXT NOT NULL,
  chapter_id INTEGER NOT NULL CHECK (chapter_id >= 0 AND chapter_id <= 1000000),
  pickup_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pickup_id)
);

CREATE INDEX IF NOT EXISTS shafak_pickup_claims_user_chapter_idx
  ON shafak_pickup_claims (user_id, chapter_id);
