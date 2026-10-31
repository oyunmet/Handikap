---
name: War Room camera framing
description: The War Room must remain third-person with the player visible.
---

Keep third-person framing and make joystick movement camera-relative: up moves along the view's forward direction and down moves back, even after the character turns. Keep camera heading independent from body yaw so reversing or sidestepping can show the character's face or side instead of rotating the view and reversing the controls. Touch drags outside the movement joystick must not control the camera. During forward movement the camera remains behind the character; when geometry blocks that path, shorten the distance rather than clipping through a wall. Indoors, keep camera and look target within the building, with readable framing. Recover the player to a clear nearby position if they enter blocking geometry.

**Why:** The user reported that after turning around, joystick up/down became reversed. They also asked to allow the character to face the camera or turn sideways while moving backward or laterally. A camera heading that rotates with body yaw makes screen-relative controls switch direction.

**How to apply:** Keep a stable camera/control heading separate from body facing for the duration of a run. Transform movement input using that heading; let body facing follow the requested direction without rotating the camera heading. Reset the heading for a new run. Do not add screen-drag look controls unless requested. Preserve collision shortening, indoor clearance, and the corrected gameplay-yaw/hero-root-yaw conversion.
