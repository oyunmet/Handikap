---
name: Cascade resolution
description: The user's requirement for matches created during gravity/refill in the Royal Match game.
---

Every line or square match formed after tiles fall or refill must be processed before the move returns a settled board.

**Why:** The user reported four- and five-tile runs remaining after top-down refills and expects them to burst like ordinary matches.

**How to apply:** Resolve matches after each gravity step and ensure a cascade safety limit never returns a board with a pending match.
