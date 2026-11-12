---
name: War Room adaptive DPR
description: Preserve runtime pixel-ratio changes across React renders.
---

Keep the active War Room DPR in parent React state and pass it back to the R3F Canvas. A child-only `useThree().setDpr()` change can be overwritten when the parent rerenders with its original `dpr` prop.

**Why:** The HUD causes ordinary parent renders during a match, which can silently undo adaptive resolution reductions.

**How to apply:** When changing runtime pixel ratio, keep the Canvas prop and R3F store synchronized; verify the actual canvas dimensions in a running benchmark while HUD updates occur.
