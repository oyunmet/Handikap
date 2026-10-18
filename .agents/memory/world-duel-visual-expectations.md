---
name: World and duel visual expectations
description: Player-facing requirements for stable world rivals, clear duels, and discoverable road rewards and hazards.
---

World encounter rivals must stay anchored to their encounter locations instead of pacing, following the player, or sliding when revisiting. During a duel, both fighters must face each other and appear side by side across the screen, not stacked vertically. Use a rear-side camera angle that keeps the player's weapon hand and attack effects clearly visible; never present the player facing the camera. Keep bosses on a player-like humanoid rig and distinguish them with their own armor, silhouette, patterns, and shapes instead of a mismatched standalone skeleton; attach weapons and equipment to the rig's hand and bones. Keep the arena clear of world scenery and duplicate overlays so both fighters remain visible. Road rewards and hazards must be visually obvious and reachable; seeded content that players cannot see does not satisfy the requirement.

**Why:** The user reported that a pushed change still left moving rivals, obscured duel fighters, and no visible treasure or traps, then clarified both the rear-camera requirement and that Demir Taç should resemble the player while remaining clearly distinct.

**How to apply:** For changes to world actors, combat cameras, equipment, or pickups, check the rendered mobile scene as well as the data and movement code. Project combatants horizontally with the camera over the player's weapon-side shoulder, apply both x and z actor coordinates, and align hit feedback with their screen positions. Test that attached weapons move with the hand during attacks. Preserve gameplay expectations in both WebGL and 2D fallback paths.
