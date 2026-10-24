---
name: GLB animation bounds
description: Preserve animated frame-zero transforms during GLB sizing and verify upright posture in all axes.
---

Apply the first GLB animation frame before measuring bounds, and keep those transforms applied through `Box3.expandByObject(object, true)`. Do not call `AnimationMixer.stopAllAction()` first; it restores the unanimated transform values and can produce incorrect bounds. For animation regressions, test in the same prepare → clone → play order as production: bones not keyed by the next clip retain the prepared pose.

For upright-pose checks, measure the full 3D Hips-to-Head axis: `atan2(hypot(horizontalX, horizontalZ), verticalY)`. Testing only the character-right component misses forward/backward pitch, which can appear to switch screen sides when the actor turns around. On the Quaternius player GLB, neutralize the locomotion spine chain's average rotation and add neutral tracks for unanimated bones so Idle, Walk, and Run do not inherit tilted bind transforms. Preserve per-cycle motion and avoid a permanent rotation on the whole model.

**Why:** A synthetic animated asset showed that stopping its mixer reset the mesh scale before fitting, so the size calculation measured the bind pose instead of the requested first animation frame. The player Run clip also omitted a Body rotation track; the prepared Idle pose therefore persisted into Run and caused about 14° of real lateral lean, while tests that played Run on the untouched GLB missed it. Later screenshots exposed a separate forward-pitch component that lateral-only measurements could not detect.

**How to apply:** In any GLB loading or fitting path, measure after frame-zero animation is applied and verify the returned world dimensions with an animated fixture. For locomotion pose checks, reproduce the production initialization and clip transitions on a fresh asset, then measure the complete 3D body axis as well as world bounds.
