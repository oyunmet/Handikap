---
name: War Room enterable buildings
description: Shared collision and rendering rules for indoor War Room cover.
---

Build entrances from separate wall-segment blockers with matching visible wall segments; do not represent an enterable building as one solid blocker. Reuse room-transformed blockers for player movement and shot/line-of-sight tests. Transform shells and interior cover with the same room rotation, but do not shift interior props with exterior cover offsets.

**Why:** War Room buildings must be enterable and offer real cover. If door visuals, movement collision, and shot occlusion diverge, doors become fake or shots pass through walls.

**How to apply:** When adding or rotating buildings, test walking through the doorway and confirm walls and interior cover block shots in every room rotation.
