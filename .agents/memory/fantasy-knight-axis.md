---
name: Fantasy Knight GLB axis and rig
description: Coordinate and animation constraints of the legacy low-poly fantasy knight asset.
---

The legacy fantasy knight GLB is authored with Z-up coordinates and contains separate static meshes rather than a skeleton or animation clips. In the Three.js Y-up world, apply an X rotation of -90° before measuring and fitting its bounds. Do not treat its named meshes as rig bones.

Use the shared animated humanoid hero rig for Demir Taç, then attach its crown and layered armor to the corresponding bones. Include the finished gear when fitting its world and duel bounds. Keep character-visual changes scoped to Demir Taç and the player unless asked otherwise; the other rivals are the preferred visual reference.

**Why:** Without the axis conversion, the old source asset lies sideways. Its static, low-detail standalone runtime version also looked too simple and could not animate with the other fighters.

**How to apply:** Keep the source GLB out of runtime character selection. Use rig-mounted Demir Taç gear and measure after accessories are attached; preserve the established appearance of other rivals.
