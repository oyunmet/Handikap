---
name: War Room camera framing
description: The War Room must remain third-person with the player visible.
---

The War Room camera must use third-person framing and remain behind the visible hero; do not switch to first-person. Derive camera yaw from the rendered player root, not the control target. During turns, keep the camera on the hero's current rear line instead of letting its position lag across the front. During normal movement, the hero and camera follow travel direction; aiming may preserve intentional strafe. In buildings, keep camera and look target inside the room and frame closer than outdoors.

**Why:** The current user explicitly requires the hero's back to remain visible and reports that front-facing views, sideways movement, and distant indoor framing are still broken.

**How to apply:** Keep manual look, touch-start movement basis, and body yaw coordinated; use the rendered body's current direction for third-person camera placement. Verify all joystick directions, turning while moving, aiming/strafe, and indoor doorway/stair clearance.
