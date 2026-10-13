---
name: WebGL preview limits
description: How to distinguish successful 3D asset loading from screenshot-based rendering verification.
---

Treat a WebGL-unavailable message in Replit's screenshot preview as a limit of that browser, not proof that an asset failed to load. A GLB request completing and interactive controls working verifies loading and app flow, but does not confirm the model's rendered pixels. Keep gameplay available with a real 2D world whenever renderer creation fails; a static error screen is not an adequate fallback.

Do not create and destroy a throwaway WebGL context to preflight support on mobile Safari. Check for the WebGL API and let the actual renderer creation be authoritative; on touch devices, keep the renderer at DPR 1, disable shadows and post-processing, and avoid retaining already-passed opponents in the scene.

**Why:** The preview can show the game UI while refusing to create a WebGL scene, and a mobile production report exposed that a renderer failure must not make the game unplayable. A runtime context loss can leave a black canvas while the game loop and HTML continue, so an overlay alone is not recovery. A separate production screenshot showed that a near-black world can also be caused by a full-screen lighting tint while gameplay still renders normally. Mobile Safari also has a limited graphics-memory/performance budget, so stacked render targets, high-DPR output, shadow maps, and off-camera actors add avoidable GPU work.

**How to apply:** On renderer creation failure or `webglcontextlost`, remove the unusable canvas and immediately keep player motion, pickups, obstacles, rivals, and encounters visible in a lightweight 2D scene with an explicit retry action. When gameplay UI remains visible behind a black-looking world, inspect full-screen lighting layers before treating it as GPU loss. Keep the darkness setting shared and conservative across both the standard and offscreen-worker render paths. Report asset loading, interaction, and visual rendering as separate checks. Do not claim the 3D model is visually verified unless the capture actually shows it. For touch renderers, apply the conservative graphics budget before scene rendering rather than waiting for a device-specific black-frame heuristic.

### iPhone production recovery

When the world remains black on iPhone after the camera far-plane and sky-fog changes are confirmed in the live bundle, use the existing playable 2D world on iPhone/iPad and retain 3D on Android and desktop.

**Why:** The confirmed live camera/fog changes did not fix the production iPhone scene. The existing 2D renderer remained visible in an iPhone-emulated gameplay run beyond the reported distance.

**How to apply:** Select the 2D world directly for iPhone/iPad rather than waiting for WebGL to report context loss. Keep movement, pickups, obstacles, rivals, encounters, and touch controls active.
