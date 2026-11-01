---
name: War Room viewmodel rendering
description: Keep the first-person arms and weapon visible in the War Room scene.
---

Do not mount the War Room first-person viewmodel through a React Three Fiber portal to the default camera: the camera is not traversed as a scene child, so that portal can silently render nothing. Keep the viewmodel as a normal scene child and update its world position and rotation from the camera transform each frame. Keep its meshes late in render order with depth testing disabled so the weapon remains visible.

**Why:** The camera portal passed type checks and pose tests but produced no arms or weapon in actual 3D output.

**How to apply:** Verify viewmodel changes in a rendered screenshot, preferably with SwiftShader Chromium when Replit's screenshot browser cannot create WebGL. Unit tests for pose math do not prove the model is visible.
