---
name: Mobile frame-rate verification
description: Replit development preview measurements and the outstanding 60 FPS acceptance target.
---

The movement screen measured roughly 24–29 FPS during automated movement in Replit's development screenshot runner. This does not establish production or target-device performance.

On 2026-10-09, the app preview screenshot runner showed the built-in “WebGL unsupported” fallback on the debug 3D-world route, so it could not render that scene for visual inspection.

**Why:** The screenshot runner and development build are not a representative mobile production runtime, so this measurement cannot confirm that the 60 FPS target is met.

**How to apply:** Treat 60 FPS as outstanding until measured on a target mobile device or a production-mode run. If app-preview capture cannot create a WebGL context, do not infer a scene failure from its fallback; use a WebGL-capable browser for visual verification.
