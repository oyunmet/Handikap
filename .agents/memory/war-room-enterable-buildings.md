---
name: War Room enterable buildings
description: Shared collision and rendering rules for indoor War Room cover.
---

Build entrances from separate wall-segment blockers with matching visible wall segments; do not represent an enterable building as one solid blocker. Reuse room-transformed blockers for player movement and shot/line-of-sight tests. Transform shells and interior cover with the same room rotation, but do not shift interior props with exterior cover offsets. Upper-floor platform blockers need their real vertical position: they should block shots between floors, not horizontal movement; ground-level overlap checks should ignore vertically separate platforms.

**Why:** War Room buildings must be enterable and offer real cover. If door visuals, movement collision, and shot occlusion diverge, doors become fake or shots pass through walls. Treating upper floors as ground-plane blockers traps actors and makes unrelated ground pickups appear obstructed.

**How to apply:** When adding or rotating buildings, test door and stair traversal, floor-height changes, and cross-floor shot blocking in every room rotation.
