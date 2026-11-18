---
name: World camera clearance
description: Procedural scenery placement constraints that keep the third-person view unobstructed.
---

Keep the mobile travel camera outside the swept volume of road obstacles; moving tall scenery to the roadside alone does not prevent a near-field occlusion.

**Why:** The running camera offset and movement camera lag can place the camera behind a central obstacle while the player has already passed it. Stopping changes that offset and can make the scene appear to recover.

**How to apply:** When changing mobile camera offsets or obstacle placement, test camera world position against the full depth of nearby road obstacles at rest, while running, and while the follow heading turns forward, sideways, and backward. Do not assume that moving tall props off the center lane fixes motion-linked black screens.

For city-hub cameras, match camera obstacle bounds to the visible roof geometry and keep the walkable player boundary outside the camera-clearance margin. Never accept a clipped camera frame that collapses near the player; an overhead fallback must also have a clear path.

**Why:** The mobile city allowed the player to stand just inside the camera's expanded building bounds. Every shoulder shot then clipped back to the target, placing the camera inside the structure.

**How to apply:** Test legal positions around every building edge, all movement headings, camera-to-target distance, and the complete target-to-camera path. Keep movement collision and camera obstruction geometry in agreement.
