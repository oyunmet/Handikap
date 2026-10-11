---
name: Account duel recovery
description: Preserve one server-owned challenge when a mobile refresh interrupts a fight.
---

An unfinished authenticated duel must be recoverable by returning its original duel ID, seed, opponent, and starting combat stats. The client must trust the returned opponent rather than assume it matches the rival selected after refresh. This restarts the simulation from the saved seed; it does not restore the exact in-fight tick or HP because the input tape is submitted at completion, not checkpointed during play.

**Why:** A mobile browser refresh clears the in-memory duel ID while the database row remains open; returning only `409 duel_already_active` can prevent every later fight for that player.

**How to apply:** Keep the one-open-duel constraint and transaction lock. When changing start/retry behavior, verify that a repeated start does not create a second row and that settlement still awards only once. Do not describe seed-based restart as restoring the exact fight position.
