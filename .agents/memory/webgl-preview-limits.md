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

Do not use `readPixels()` from the default drawing buffer as a production black-screen detector on iOS. Keep pixel sampling diagnostic-only; use actual context-loss and render-loop signals for recovery.

**Why:** On iPhone Safari, default-buffer readback can report near-black while the scene is visibly drawing, which falsely triggers a blocking recovery panel.

**How to apply:** Never gate movement or scene recovery on sampled framebuffer brightness unless the renderer uses a verified readable render target and the check has been confirmed on a real device.

When renderer creation fails, global diagnostics can fire while React is committing the Canvas error path. Do not synchronously update React state from that diagnostic event; queue and coalesce entries, then flush asynchronously. Bound context-creation retries and show a terminal compatibility/retry screen instead of an indefinite “reloading” state.

**Why:** The Replit screenshot browser for this project cannot create a WebGL context. Synchronously appending each renderer error to React state caused a maximum-update-depth crash, while a scene-only retry did not create a new renderer and left the recovery overlay stuck.

**How to apply:** Treat missing WebGL separately from black rendered frames. Batch debug events outside the renderer/error commit stack, remount the Canvas for context-creation retries, then exit cleanly to a user-facing retry screen when retries are exhausted.
