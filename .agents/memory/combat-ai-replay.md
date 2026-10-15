---
name: Deterministic combat AI replay
description: How opponent behavior stays authoritative and reproducible in account duels.
---

Opponent archetype and AI behavior must be derived from the server-owned rival record and passed into both live combat and server replay. Never let a client choose an archetype that changes combat outcomes.

**Why:** The server validates duel results by replaying the player's input tape; differing AI profiles would make client and server simulations disagree and could invalidate rewards.

**How to apply:** When adding or balancing an opponent type, keep its identifier and deterministic behavior available to both challenge creation and `replayCombat`, and cover the full path with replay tests.

Persist the server-owned encounter parameters at duel start, including selected difficulty and progression tuning. Retries and server replay must use that snapshot instead of recalculating from current player or route state.

**Why:** Those inputs can change during a duel or after a balance update; recomputing them would make the same input tape resolve against a different encounter.

**How to apply:** Snapshot validated encounter inputs when creating the challenge, derive tuning deterministically, and test that a retry and completion preserve the original values.
