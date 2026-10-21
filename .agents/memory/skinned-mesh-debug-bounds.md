---
name: Skinned-mesh debug bounds
description: Measure animated character geometry rather than distant source pivots.
---

For world-character placement diagnostics, compare the actor root to each skinned mesh's current deformed world-space bounding-box center, not the `SkinnedMesh` object's world origin. In `player-hero.glb`, the `Rogue_*` mesh pivots are about 9.98 m from the actor while their deformed geometry remains within the character's body.

**Why:** Pivot-based checks emitted dozens of false `HATA` warnings and obscured useful mobile movement diagnostics even though the animated geometry was correctly placed.

**How to apply:** Update the skeleton before computing deformed bounds, transform the bounds center by the mesh world matrix, and throttle expensive debug inspection rather than recalculating every render frame. Keep a regression test using the real player GLB.
