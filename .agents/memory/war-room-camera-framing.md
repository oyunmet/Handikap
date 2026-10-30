---
name: War Room camera framing
description: The War Room must remain third-person with the player visible.
---

The War Room always uses third-person framing with the player's back toward the camera; do not restore first-person from legacy preferences or show the player's front. When not aiming or in a brief post-attack strafe, face the player toward joystick movement and follow that body yaw from behind; aiming may retain camera-facing strafe. When the player is inside a building, keep the camera and look target inside that building, use wider framing than the old 2 m close-up but closer than outdoors, and shorten below preferred distance rather than pushing through a wall. Recover the player to a clear nearby position if they enter blocking geometry.

**Why:** The user explicitly requires a rear third-person view, movement-aligned turning, and readable interiors. A forced camera-facing setting kept joystick movement in strafe, while enforcing a minimum indoor distance after a wall hit placed the camera inside geometry.

**How to apply:** Preserve third-person rear framing; keep the camera at least 2.5 metres away outdoors when clear. Movement-facing must be the default, with legacy camera-facing defaults migrated, while current explicit settings remain selectable. Indoor placement must honor swept wall clearance even when that makes the camera closer than its preferred distance; keep framing wide enough to show the player and room.
