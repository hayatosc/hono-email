---
'@hono-email/preview': patch
---

Fix the `hono-email-preview` binary and stop shipping raw `.tsx` sources.

- Emit the `#!/usr/bin/env node` shebang from the CLI source so the published bin is executable, and replace the `import.meta.main` guard (only defined on Node 24.2+) with a `realpathSync`-based check that runs on all supported Node versions.
- Pre-bundle the browser preview UI with Vite into `dist/client` instead of copying raw `.tsx` files. The published package now serves compiled assets, and template live-reload is delivered over a Server-Sent Events channel (`/__live`) rather than Vite's `import.meta.hot`, which is unavailable in the compiled client.
