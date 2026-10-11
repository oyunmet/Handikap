---
name: Vercel native TypeScript imports
description: Runtime import behavior for this project's Vercel Node serverless APIs.
---

The Vercel project uses Node 24.x with ESM. Keep explicit `.ts` suffixes on every relative TypeScript import reachable from an `api/` function. Vercel builds the function entrypoint as JavaScript, while Node resolves its local TypeScript modules natively; `tsx` in local development accepts extensionless paths and can hide this deployment failure. Keep runtime TypeScript syntax erasable by Node's native type stripping.

**Why:** A live Vercel invocation failed with `ERR_MODULE_NOT_FOUND` for `/var/task/db/postgres`, while the same API worked locally under `tsx`.

**How to apply:** When changing a Vercel function's import graph, walk the graph recursively, use explicit `.ts` specifiers, and run the import-graph regression test plus typecheck, tests, and build. Check the Vercel project's configured Node version before changing its TypeScript/runtime strategy.
