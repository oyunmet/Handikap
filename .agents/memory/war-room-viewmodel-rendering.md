---
name: War Room viewmodel rendering
description: Keep the first-person arms and weapon visible in the War Room scene.
---

Render the War Room first-person viewmodel in its own scene, with the active camera passed explicitly to the portal. Draw the world first, clear depth, then draw the viewmodel scene so weapon parts depth-test against each other without being hidden by world geometry. Never portal to the default camera object as a scene child.

**Why:** A portal to the default camera passed type checks and pose tests but produced no arms or weapon. The separate scene and second pass meet the viewmodel overlay requirement while keeping weapon-internal depth.

**How to apply:** Verify viewmodel changes in a rendered screenshot, preferably with SwiftShader Chromium when Replit's screenshot browser cannot create WebGL. Unit tests and a successful build do not prove the model is visible.
