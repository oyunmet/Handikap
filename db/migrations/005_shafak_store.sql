ALTER TABLE shafak_duels
  ADD COLUMN IF NOT EXISTS player_stats JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS shafak_store_transactions (
  user_id TEXT NOT NULL,
  idempotency_key UUID NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('purchase', 'upgrade')),
  item_id TEXT NOT NULL,
  response JSONB NOT NULL CHECK (jsonb_typeof(response) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS shafak_store_transactions_created_idx
  ON shafak_store_transactions (created_at);
