---
name: War Room GLB atlas fallback
description: Missing castle-kit texture atlas and loading-progress behavior.
---

The War Room castle-kit GLBs reference a shared external `Textures/colormap.png` that is not present in the project. Keep their geometry and provide a local stone-texture fallback for only that missing URL.

**Why:** Drei's `useProgress` observes Three.js's default loading manager. A separate manager made the briefing appear ready before all scene assets finished loading.

**How to apply:** Load War Room GLBs through the shared default manager, route only the absent colormap URL to the local fallback, and retain per-asset geometry fallbacks for actual GLB load failures.
