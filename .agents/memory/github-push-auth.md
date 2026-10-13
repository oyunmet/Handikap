---
name: GitHub push authentication
description: A Replit GitHub source-control connection may appear healthy while GitHub pushes still fail authentication in this workspace.
---

When a push to GitHub fails with an authentication error, do not assume a successful integration-bind response fixed Git CLI auth. `addIntegration` can report success or `connectionAlreadyAdded` while the connection still reports `not_added`; `git ls-remote` may work anonymously even when writes fail. A healthy OAuth status does not prove the workspace's Git CLI can push.

**Why:** In this workspace, the source-control connection status, bind response, and Git CLI write access have disagreed. Repeating the same push or trying a reauthorization flow for an unbound connection does not repair that mismatch.

**How to apply:** Check the live integration status and remote branch before any write. If the connection stays `not_added` or GitHub rejects the push, stop; have the owner connect GitHub in the Replit Git tool before retrying. Never request or expose a raw token in chat, and do not claim Vercel has the fix until its production deployment points to the new commit.
