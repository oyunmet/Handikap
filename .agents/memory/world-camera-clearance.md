---
name: World camera clearance
description: Procedural scenery placement constraints that keep the third-person view unobstructed.
---

Keep the mobile travel camera outside the swept volume of road obstacles; moving tall scenery to the roadside alone does not prevent a near-field occlusion.

**Why:** The running camera offset and movement camera lag can place the camera behind a central obstacle while the player has already passed it. Stopping changes that offset and can make the scene appear to recover.

**How to apply:** When changing mobile camera offsets or obstacle placement, test camera world position against the full depth of nearby road obstacles at running speed and at rest. Do not assume that moving tall props off the center lane fixes motion-linked black screens.
