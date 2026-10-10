---
name: WebGL preview limits
description: How to distinguish successful 3D asset loading from screenshot-based rendering verification.
---

Treat a WebGL-unavailable message in Replit's screenshot preview as a limit of that browser, not proof that an asset failed to load. A GLB request completing and interactive controls working verifies loading and app flow, but does not confirm the model's rendered pixels.

**Why:** The preview can show the game UI while refusing to create a WebGL scene; a separate headless browser may exercise the scene without producing a trustworthy visual capture.

**How to apply:** Report asset loading, interaction, and visual rendering as separate checks. Do not claim the 3D model is visually verified unless the capture actually shows it.
