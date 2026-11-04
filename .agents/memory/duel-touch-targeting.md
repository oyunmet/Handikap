---
name: Duel touch targeting
description: Mobile ranged weapon targeting behavior and its combat invariants.
---

Mobile duel controls do not expose a separate aim button. Ranged player attacks must remain usable without aim input; at close range, bows keep their knife behavior. Preserve bot aiming and deterministic server replay.

**Why:** Duel combat is controlled by thumbs on mobile. Requiring a separate aim input would make ranged weapons unusable after removing the aim button.

**How to apply:** When changing duel targeting or weapon input, keep ranged attacks accessible on touch and do not alter bot-owned aim or replay rules.
