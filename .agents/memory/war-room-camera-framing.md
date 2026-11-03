---
name: War Room camera framing
description: The War Room must remain third-person with the player visible.
---

Use first-person camera framing in War Room: hide the full animated player body, show camera-mounted arms and the current weapon, and reveal an articulated lower-body view when the player looks down. Keep the left-side joystick/right-side touch-look split and desktop mouse look. Preserve camera yaw, pitch, and movement-basis separation so manual look while moving does not cause movement feedback. Third-person framing is no longer the War Room default.

**Why:** The user requested first-person framing and later clarified that looking down must show the hero's feet and moving leg joints. The full animated body still needs to stay hidden to avoid camera clipping.

**How to apply:** Keep camera yaw, manual-look state, touch-start movement basis, and player body yaw separate. Verify simultaneous left movement/right look, all joystick directions, first-person weapon visibility, the lower-body view while looking down, and indoor doorway/stair clearance.
