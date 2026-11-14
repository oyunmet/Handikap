CREATE TABLE IF NOT EXISTS shafak_ad_reward_challenges (
  user_id TEXT NOT NULL,
  nonce UUID NOT NULL,
  placement TEXT NOT NULL CHECK (placement = 'daily-ad-duel'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, nonce)
);

CREATE INDEX IF NOT EXISTS shafak_ad_reward_challenges_created_at_idx
  ON shafak_ad_reward_challenges (created_at);

CREATE INDEX IF NOT EXISTS shafak_ad_reward_challenges_user_created_idx
  ON shafak_ad_reward_challenges (user_id, created_at DESC);

DELETE FROM shafak_ad_reward_challenges
WHERE created_at < NOW() - INTERVAL '2 days';
