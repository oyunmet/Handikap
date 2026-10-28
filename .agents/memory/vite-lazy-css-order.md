---
name: Vite lazy-route CSS order
description: Keep responsive overrides effective on code-split screens.
---

Import route-specific responsive CSS after that route's base stylesheet. CSS imported only by the app shell can load before a lazy route's stylesheet, allowing equal-specificity route defaults to override it.

**Why:** The preview showed unchanged layout despite the shell override being present; the page's later-loaded stylesheet won the cascade.

**How to apply:** For lazy pages, import the override after the page CSS or give it deliberate selector specificity, then inspect the actual route at its target viewport.
