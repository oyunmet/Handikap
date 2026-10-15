---
name: Road reward clarity
description: Keep collectible-looking world props and obstacle visibility aligned with actual gameplay behavior.
---

**Rule:** On the road, coins and gems that look collectible must actually be collectable; collidable obstacles, including treasure chests, must be visible before the player can hit them.

**Why:** The user wants road items to have a real purpose and collisions to be fair and visually understandable.

**How to apply:** Avoid decorative coin/gem decoys in the road corridor. When adding or moving an obstacle, keep its render visibility, warning marker, and collision bounds in sync.
