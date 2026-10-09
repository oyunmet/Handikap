---
name: External npm lockfile portability
description: Keep lockfiles created inside Replit installable by external CI platforms.
---

Check npm lockfiles before using them in external CI. Replit-generated `resolved` tarball URLs can point to `package-firewall.replit.internal`, which build workers such as Vercel cannot resolve. Use public npm registry URLs while preserving package versions and integrity hashes.

**Why:** The Replit package firewall hostname is private to Replit's network.

Vercel may run both the configured npm install command and a later frozen `pnpm install`. A successful `npm ci` does not prove that the deployment install will pass if `pnpm-lock.yaml` has stale root dependency specifiers.

**Why:** A Vercel build completed `npm ci` but then failed its frozen pnpm install because three package.json dependencies were missing from the pnpm root importer.

**How to apply:** After dependency changes, regenerate the pnpm lock and verify `pnpm install --frozen-lockfile --ignore-scripts`. Also keep the existing npm lock normalization step for external registry URLs.
