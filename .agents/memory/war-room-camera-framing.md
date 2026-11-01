---
name: War Room camera framing
description: The War Room must remain third-person with the player visible.
---

Keep third-person framing behind the hero's facing direction, including when reverse input turns the hero around. Keep the joystick's world heading latched while it is actively held so the camera's follow rotation cannot reverse movement mid-drag; when the stick returns to neutral, sync controls to the new camera heading. Touch drags outside the movement joystick must not control the camera. Indoors, keep the camera and look target within the current building and floor, reduce shoulder offset, and preserve enough distance to show the hero; shorten around blocking geometry rather than crossing walls. Recover the player to a clear nearby position if they enter blocking geometry.

**Why:** The user explicitly asked for a rear view while moving backward and for joystick directions to adapt after the camera turns, while avoiding control reversal during an active drag.

**How to apply:** Smoothly follow body facing with the view heading. Use that view heading for new joystick movement, but hold the current control heading until the stick is released. Keep view and control headings separate; reset both for a new run. Do not add screen-drag look controls unless requested. Preserve indoor clearance and the corrected gameplay-yaw/hero-root-yaw conversion.
