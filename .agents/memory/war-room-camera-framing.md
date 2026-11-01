---
name: War Room camera framing
description: The War Room must remain third-person with the player visible.
---

Keep camera yaw and pitch under explicit look input, separate from player body yaw. Left-stick directions must always map to the current camera heading while held; do not latch a stale world heading as the view turns. Right-side touch drags and mouse drags control camera look independently from movement. Keep the body aligned with the view while idle or aiming, and support backward and lateral movement without rotating the camera underneath the stick. Indoors, keep the camera and look target within the current building and floor; shorten around blocking geometry rather than crossing walls. Recover the player to a clear nearby position if they enter blocking geometry.

**Why:** The user wants Call of Duty-style mobile controls: the left stick must remain screen-relative in all four directions while right-side drags turn the view. Automatically rotating the camera with the player's movement makes a held joystick change meaning and can reverse its apparent direction.

**How to apply:** Keep view yaw/pitch, movement input, and body yaw as separate values. Test forward, backward, left, and right at multiple camera headings, including simultaneous left-stick movement and right-side look input. Verify doors, stairs, and indoor camera clearance after movement changes; preserve the gameplay-yaw/hero-root-yaw conversion.
