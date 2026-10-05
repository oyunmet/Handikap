---
name: External npm lockfile portability
description: Keep lockfiles created inside Replit installable by external CI platforms.
---

Check npm lockfiles before using them in external CI. Replit-generated `resolved` tarball URLs can point to `package-firewall.replit.internal`, which build workers such as Vercel cannot resolve. Use public npm registry URLs while preserving package versions and integrity hashes.

**Why:** The Replit package firewall hostname is private to Replit's network.

**How to apply:** After dependency installation in Replit, inspect `package-lock.json` for private firewall URLs before pushing to GitHub for external builds.
