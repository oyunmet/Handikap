---
name: GLB animation bounds
description: Preserve animated frame-zero transforms during world-space model sizing.
---

Apply the first GLB animation frame before measuring bounds, and keep those transforms applied through `Box3.expandByObject(object, true)`. Do not call `AnimationMixer.stopAllAction()` first; it restores the unanimated transform values and can produce incorrect bounds.

**Why:** A synthetic animated asset showed that stopping its mixer reset the mesh scale before fitting, so the size calculation measured the bind pose instead of the requested first animation frame.

**How to apply:** In any GLB loading or fitting path, measure after frame-zero animation is applied and verify the returned world dimensions with an animated fixture.
