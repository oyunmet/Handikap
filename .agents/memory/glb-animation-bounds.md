---
name: GLB animation bounds
description: Preserve animated frame-zero transforms during world-space model sizing.
---

Apply the first GLB animation frame before measuring bounds, and keep those transforms applied through `Box3.expandByObject(object, true)`. Do not call `AnimationMixer.stopAllAction()` first; it restores the unanimated transform values and can produce incorrect bounds. For animation regressions, test in the same prepare → clone → play order as production: bones not keyed by the next clip retain the prepared pose.

**Why:** A synthetic animated asset showed that stopping its mixer reset the mesh scale before fitting, so the size calculation measured the bind pose instead of the requested first animation frame. The player Run clip also omitted a Body rotation track; the prepared Idle pose therefore persisted into Run and caused about 14° of real lateral lean, while tests that played Run on the untouched GLB missed it.

**How to apply:** In any GLB loading or fitting path, measure after frame-zero animation is applied and verify the returned world dimensions with an animated fixture. For animation pose checks, reproduce the production initialization sequence on a fresh asset and measure world-space joints after each clip change.
