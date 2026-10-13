---
name: WebGL preview limits
description: How to distinguish successful 3D asset loading from screenshot-based rendering verification.
---

Treat a WebGL-unavailable message in Replit's screenshot preview as a limit of that browser, not proof that an asset failed to load. A GLB request completing and interactive controls working verifies loading and app flow, but does not confirm the model's rendered pixels. This game must remain 3D; do not replace the world with a 2D fallback when renderer creation fails.

Do not create and destroy a throwaway WebGL context to preflight support on mobile Safari. Check for the WebGL API and let the actual renderer creation be authoritative; on touch devices, keep the renderer at DPR 1, disable shadows and post-processing, and avoid retaining already-passed opponents in the scene.

**Why:** The preview can show the game UI while refusing to create a WebGL scene, and a mobile production report exposed that a renderer failure must not make the game unplayable. A runtime context loss can leave a black canvas while the game loop and HTML continue, so an overlay alone is not recovery. A separate production screenshot showed that a near-black world can also be caused by a full-screen lighting tint while gameplay still renders normally. Mobile Safari also has a limited graphics-memory/performance budget, so stacked render targets, high-DPR output, shadow maps, and off-camera actors add avoidable GPU work.

**How to apply:** On renderer creation failure, context loss, or persistent black output, recreate the 3D renderer and then retry the 3D scene with conservative graphics settings. If it still cannot start, show a 3D retry message rather than a 2D world. When gameplay UI remains visible behind a black-looking world, inspect full-screen lighting/compositing and final post-processing output before treating it as GPU loss. Keep the darkness setting shared and conservative across render paths. Report asset loading, interaction, and visual rendering as separate checks. Do not claim the 3D model is visually verified unless the capture actually shows it. For touch renderers, apply the conservative graphics budget before scene rendering.

The user requires the gameplay world to stay 3D on both mobile and PC and explicitly rejects any 2D world. Black output is reported on PC as well, so do not assume Safari is the sole cause; the touch-only compositing safeguard is supplemental.

**Why:** the user said the black screen remained even at the requested older commit, reported it on PC too, and said never to switch to 2D.

**How to apply:** Diagnose the shared WebGL, lighting, and post-processing path across desktop and mobile. Rebuild the 3D renderer/scene after persistent black frames; preserve the world’s 3D presentation and never use a 2D fallback.
