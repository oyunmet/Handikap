---
name: Fantasy Knight GLB axis and rig
description: Coordinate and animation constraints of the legacy low-poly fantasy knight asset.
---

The legacy fantasy knight GLB is authored with Z-up coordinates and contains separate static meshes rather than a skeleton or animation clips. In the Three.js Y-up world, apply an X rotation of -90° before measuring and fitting its bounds. Do not treat its named meshes as rig bones.

**Why:** Without the axis conversion, the knight lies sideways in the world. Adding bone-mounted costume pieces to its static mesh hierarchy also places those pieces incorrectly.

**How to apply:** When reusing this source asset, keep it isolated from animated hero rigs, rotate it before fitting, and build essential armor/crown features into the asset or another explicitly positioned static geometry layer.
