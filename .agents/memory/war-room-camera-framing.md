---
name: War Room camera framing
description: The War Room must remain third-person with the player visible.
---

Keep the War Room third-person camera behind the movement heading selected by the mobile joystick. Left-side joystick movement automatically turns the camera toward the selected heading when there is no active manual look; a right-side touch drag temporarily owns camera yaw and pitch. Capture the camera yaw at joystick start so automatic camera motion cannot feed back into a held stick; if the player manually looks while moving, rebase movement against that view, then resume auto-follow on release. Desktop mouse look remains available. Preserve indoor camera bounds, obstruction avoidance, and player recovery.

**Why:** The user explicitly requested both Call of Duty Mobile-style split touch zones and automatic camera alignment with joystick movement.

**How to apply:** Keep current camera yaw, manual-look state, auto-follow target, touch-start movement basis, and player body yaw separate. Verify simultaneous left movement/right look, auto-follow after releasing look, all joystick directions, and indoor camera clearance.
