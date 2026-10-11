---
name: WebGL preview limits
description: How to distinguish successful 3D asset loading from screenshot-based rendering verification.
---

Treat a WebGL-unavailable message in Replit's screenshot preview as a limit of that browser, not proof that an asset failed to load. A GLB request completing and interactive controls working verifies loading and app flow, but does not confirm the model's rendered pixels.

**Why:** The preview can show the game UI while refusing to create a WebGL scene; a separate headless browser may exercise the scene without producing a trustworthy visual capture.

**How to apply:** Report asset loading, interaction, and visual rendering as separate checks. Do not claim the 3D model is visually verified unless the capture actually shows it.

Do not create and forcibly lose a throwaway WebGL context before mounting the real renderer. On iOS and other context-limited browsers, let the one production renderer determine whether creation succeeds, then use its error boundary and recovery path.

**Why:** Browser WebGL APIs can exist even when context creation fails, and an extra context consumes scarce device resources without proving the actual scene can render.

**How to apply:** Use API presence only as a lightweight preflight; never call `getContext()` plus `WEBGL_lose_context` as a probe before React Three Fiber creates its renderer.
