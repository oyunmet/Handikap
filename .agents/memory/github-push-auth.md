---
name: GitHub push authentication
description: A Replit GitHub source-control connection may appear healthy while GitHub pushes still fail authentication in this workspace.
---

When a push to GitHub fails with an authentication error, do not assume a successful integration-bind response fixed Git CLI auth. In this workspace, the connection stayed `not_added` after `addIntegration` reported success, and the authorized `main` push still failed. The authorized code is committed locally and was not deployed.

**Why:** Retrying the same push did not help, while the integration status and bind response disagreed; the repository needs a working GitHub authorization before an automatic Vercel deploy can start.

**How to apply:** Check the live GitHub integration state or reconnect it before retrying the local `main` push. Never request or expose a raw token in chat.
