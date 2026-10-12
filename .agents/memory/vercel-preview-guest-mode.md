---
name: Vercel Preview guest mode
description: Environment boundary for unauthenticated guest access in Vercel previews.
---

When Clerk keys are missing, Vercel Preview may run the device-local guest game. Production must remain closed until Clerk is configured, and account, duel, store, and reward APIs must remain server-authenticated.

**Why:** Preview deploys are useful for gameplay review before auth is provisioned, but enabling the guest client must not expose account-backed or server-mutating features.

**How to apply:** Allow the guest entry only for local development or an explicit Vercel Preview build. Keep Clerk entry precedence and the server API authentication checks intact.
