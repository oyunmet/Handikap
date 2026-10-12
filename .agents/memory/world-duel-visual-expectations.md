---
name: World and duel visual expectations
description: Player-facing requirements for stable world rivals, clear duels, and discoverable road rewards and hazards.
---

World encounter rivals must stay anchored to their encounter locations instead of pacing, following the player, or sliding when revisiting. During a duel, keep the arena clear of world scenery and duplicate overlays so both fighters remain visible. Road rewards and hazards must be visually obvious and reachable; seeded content that players cannot see does not satisfy the requirement.

**Why:** The user reported that a pushed change still left moving rivals, obscured duel fighters, and no visible treasure or traps.

**How to apply:** For changes to world actors, combat cameras, or pickups, check the rendered mobile scene as well as the data and movement code; preserve these expectations in both WebGL and 2D fallback paths.
