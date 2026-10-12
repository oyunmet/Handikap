---
name: World camera clearance
description: Procedural scenery placement constraints that keep the third-person view unobstructed.
---

Place tall roadside architecture (towers, ruins, and arches) outside the playable camera corridor. Player collision can stop movement through a structure, but it does not stop the camera's forward sightline from entering or passing behind that structure.

**Why:** The third-person camera looks well ahead of and behind the player. A large prop generated in the center lane can fill the view during movement even when the player itself is collision-blocked.

**How to apply:** When adding a tall prop kind to procedural world generation, force its lane to a road edge and add a deterministic test across multiple chunks. Keep small pickups and low ground obstacles on their existing lanes.
