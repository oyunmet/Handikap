---
name: War Room blaster ownership
description: Keep shooter-mode blasters separate from the medieval duel equipment system.
---

Blaster Kit weapons belong to the War Room loadout only. They may be purchased and shown in the shared inventory, but must not become regular duel equipment by default.

**Why:** The user asked for these models in the War Room while preserving existing combat behavior; mixing shooter weapons into the duel system would broaden that scope.

**How to apply:** Keep War Room ownership-to-loadout mapping separate from duel equipment slots. Only enable cross-mode use when explicitly requested.

Use deterministic SVG silhouettes for War Room loadout thumbnails. The asynchronous 3D-to-SVG icon path rendered as white blocks on mobile cards.

**Why:** A phone-sized preparation-screen capture showed the model-rendered icons as blank white tiles while the cached silhouettes remained visible.

**How to apply:** Keep the 3D-rendered thumbnail path disabled unless it is visually verified at mobile size; preserve the static SVG icons as the reliable fallback.
