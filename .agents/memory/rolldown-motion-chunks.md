---
name: Rolldown animation chunk cycles
description: Safari startup failures caused by cyclic Framer Motion ESM chunks in Rolldown output.
---

Safari's `undefined.filter` startup error can be caused by cyclic ESM imports between separately emitted Framer Motion, motion-dom, and motion-utils chunks, rather than malformed player data.

**Why:** The production bundle reproduced the error's launch path and contained mutually importing animation chunks; grouping those modules removed their cycle from the emitted graph.

**How to apply:** When diagnosing a Safari error after lazy app startup, inspect the built chunk import graph. Keep Framer Motion and its dependencies in a higher-priority, non-entry-aware group and verify the resulting animation chunks have no import cycle.
