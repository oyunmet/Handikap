---
name: Royal Match project direction
description: The user corrected this project's target from a garden game to a Royal Match-style match-3 game.
---

The main app should be a Royal Match-style match-3 game, not the former garden game.

Campaign requirement: open on the level map, provide 500 distinct playable levels with varied mechanics, and support touch drag-to-swap.

Use the supplied gameplay screenshots as the source of truth for the 3D tile art, scene styling, and effects; avoid replacing them with generic vector approximations.

**Why:** The user explicitly corrected the product direction and requested 500 levels, distinct features, and working touch movement.

**How to apply:** Keep the Royal Match game as the main app; preserve map-first progression and mobile drag controls. Do not restore the garden game unless the user asks.

**Why:** The user repeatedly said the game visuals still did not match the supplied screenshots and explicitly asked for identical 3D pieces, depth, animation, and effects.

**How to apply:** Prefer the provided reference art and verify the rendered game screen against it. For a swipe, use the dominant direction and move only to the immediately adjacent cell, regardless of drag distance; preserve tap-to-select.
