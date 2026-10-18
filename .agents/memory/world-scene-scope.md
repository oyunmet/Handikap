---
name: World-scene scope
description: Scope boundary for visual work on the Handikap game world.
---

For world-scene work, change scene/render/world code only. Do not change gameplay logic, UI, Turkish text, controls, economy, or save behavior.

**Why:** The user explicitly set this boundary for world visual changes.

**How to apply:** Keep environmental model, geometry, material, and placement changes in the world rendering layer; preserve gameplay and interface behavior.

When mobile screenshots show large sky-colored planes, do not call the issue fixed merely because a sky dome follows the camera or stops writing depth; those changes can leave the same full-screen geometry visible. Remove world-space sky/cloud shells and use a true scene background, checking both HDRI and procedural fallback paths.

**Why:** Production screenshots still showed the same broad planes after the fallback dome was centered and made depth-independent; that edit changed occlusion, not the visible full-screen surface.

**How to apply:** Verify the active background path on the target deployment and viewport before declaring the visual issue resolved. Keep player, road, and collision scales unchanged unless measurement proves scale is the cause.
