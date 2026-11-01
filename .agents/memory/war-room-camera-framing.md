---
name: War Room camera framing
description: The War Room must remain third-person with the player visible.
---

Keep the War Room third-person camera behind the movement heading selected by the mobile joystick. For one joystick gesture, map movement against the camera yaw captured at touch start while the camera smoothly follows the selected direction; this prevents camera motion from feeding back into the held stick. Desktop mouse look remains independent. Keep the body aligned with the view and preserve backward/lateral movement, indoor camera bounds, obstruction avoidance, and player recovery.

**Why:** The user explicitly requested that the camera automatically correct toward the direction selected by the joystick.

**How to apply:** Keep current camera yaw, its target, the touch-start movement basis, and player body yaw separate. Verify all joystick directions and camera easing, including doorways, stairs, cover, and indoor camera clearance.
