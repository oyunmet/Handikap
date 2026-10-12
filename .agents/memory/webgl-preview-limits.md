---
name: WebGL preview limits
description: How to distinguish successful 3D asset loading from screenshot-based rendering verification.
---

Treat a WebGL-unavailable message in Replit's screenshot preview as a limit of that browser, not proof that an asset failed to load. A GLB request completing and interactive controls working verifies loading and app flow, but does not confirm the model's rendered pixels.

Do not create and destroy a throwaway WebGL context to preflight support on mobile Safari. Check for the WebGL API and let the actual renderer creation be authoritative; on touch devices, keep the renderer at DPR 1, disable shadows and post-processing, and avoid retaining already-passed opponents in the scene.

**Why:** The preview can show the game UI while refusing to create a WebGL scene; mobile Safari also has a limited graphics-memory/performance budget, so stacked render targets, high-DPR output, shadow maps, and off-camera actors add avoidable GPU work.

**How to apply:** Report asset loading, interaction, and visual rendering as separate checks. Do not claim the 3D model is visually verified unless the capture actually shows it. For touch renderers, apply the conservative graphics budget before scene rendering rather than waiting for a device-specific black-frame heuristic.
