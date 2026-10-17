---
name: Replit npm lockfile recovery
description: Restore dependencies when Replit's package helper fails during npm dependency resolution.
---

If `node_modules` is absent and Replit's package installation helper fails with `Cannot read properties of null (reading 'edgesOut')` while constructing an `npm install` request, a valid `package-lock.json` may still install cleanly with `npm ci`. In this workspace, that restored the locked packages without changing `package.json` or either lockfile.

**Why:** Re-adding every declared package triggered an npm Arborist resolution error, while the lockfile-based install completed successfully.

**How to apply:** Confirm the project uses npm and has a current `package-lock.json`; use `npm ci`, then rerun typecheck, tests, and build. Do not apply this to pnpm projects or when the npm lockfile is absent.
