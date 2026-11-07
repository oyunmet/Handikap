---
name: Play Store release target
description: The user's stated Play Store goal and the release-readiness distinction.
---

The user plans to publish this game on Google Play.

Android delivery uses a Trusted Web Activity (TWA), not a locally bundled WebView,
so Clerk authentication and the relative Vercel API paths stay on the production
HTTPS origin.

**Why:** The user stated this release target, which cannot be inferred from the codebase.

**Why:** The current game uses Clerk and same-origin `/api` routes on Vercel; a
bundled web app would change the origin and require a separate auth/API migration.

**How to apply:** Keep the TWA on the production host. Before calling the game
Play-Store-ready, verify the live PWA manifest, both Digital Asset Links signing
fingerprints, a signed AAB, real-device login/gameplay/WebGL performance, and
current submission requirements; a passing web build alone is not an Android
submission.
