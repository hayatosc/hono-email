---
'@hono-email/preview': minor
'@hono-email/tailwind-plugin': patch
---

Update runtime dependencies to pick up security fixes. `@hono/node-server` moves to v2 (fixes the `serve-static` path traversal advisory GHSA-frvp-7c67-39w9), Vite moves to v8, `citty` to 0.2, and `unplugin` to 3.3. `PreviewServerOptions.host` and `.file` now accept an explicit `undefined`.
