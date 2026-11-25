---
name: Shared Fantasy Knight character base
description: The required static character source, its axis conversion, and allowed visual variants.
---

Use `/models/fantasy_knight.glb` as the sole visible character base in every game mode. It is authored with Z-up coordinates and contains separate static meshes rather than a skeleton or animation clips. In the Three.js Y-up world, apply an X rotation of -90° before measuring and fitting its bounds. Do not treat its named meshes as rig bones.

Create character differences from this shared model using static outfit colors and accessories such as hats and glasses. Do not use alternate character base meshes, skeletal rigs, or character-body animation clips. Keep gameplay movement, facing, weapons, and combat behavior intact.

**Why:** The user explicitly asked every character to derive from this exact GLB, with outfit/accessory variants, and asked to remove the other character animations.

**How to apply:** Route player, rival, NPC, city, preview, and War Room character bodies through the shared renderer. Keep the X-axis correction and fit after accessory placement; use only static visual variants.
