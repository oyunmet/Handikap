-- Permanently removes old match-puzzle move logs and score results.
-- Player profiles and duel identity/start records remain intact.
ALTER TABLE shafak_duels
  DROP COLUMN IF EXISTS moves,
  DROP COLUMN IF EXISTS result;
