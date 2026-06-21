---
'@hono-email/preview': minor
---

Rename the CLI and fix the binary, and stop shipping raw `.tsx` sources.

- **Breaking:** the CLI is now `hono-email preview` (a `preview` subcommand of the `hono-email` bin) instead of the standalone `hono-email-preview` command. Update scripts to `npx hono-email preview --dir ./emails`.
- Emit the `#!/usr/bin/env node` shebang from the CLI source so the published bin is executable, and replace the `import.meta.main` guard (only defined on Node 24.2+) with a `realpathSync`-based check that runs on all supported Node versions.
- Pre-bundle the browser preview UI with Vite into `dist/client` instead of copying raw `.tsx` files. The published package now serves compiled assets, and template live-reload is delivered over a Server-Sent Events channel (`/__live`) rather than Vite's `import.meta.hot`, which is unavailable in the compiled client.
