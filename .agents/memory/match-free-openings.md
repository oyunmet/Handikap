---
name: Match-free openings
description: Board-generation guarantees for settled starting states in the Royal Match game.
---

Every initial-board generation path must return a board with no existing match and at least one legal move. Retry-exhaustion fallbacks must obey the same checks; if generation cannot satisfy them, fail explicitly rather than returning an invalid board.

**Why:** A hard-coded retry fallback bypassed the normal board validation and could expose matches on a newly started level.

**How to apply:** When changing board generation, test both ordinary random starts and fallback/exhaustion behavior.
