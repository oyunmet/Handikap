---
name: Duel arena boundary and cover geometry
description: Keep radial arena limits and projectile-cover behavior consistent.
---

When tightening the legal movement radius, account for the cover layout as well as the visible arena. Moving actors inward can change projectile lines enough to route shots around cover, even though actors remain inside the boundary.

**Why:** A too-tight limit moved edge-aligned test actors inward and changed their bow-shot path, bypassing a cover that previously blocked it.

**How to apply:** When tuning duel bounds, verify actor clamping, cover shots, dash/knockback edges, and camera visibility together. Test scenarios should place actors within the legal arena.
