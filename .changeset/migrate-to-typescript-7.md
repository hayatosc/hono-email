---
'hono-email': patch
'@hono-email/preview': patch
'@hono-email/tailwind-plugin': patch
---

Migrate the codebase to TypeScript 7 (native compiler preview).

- Add `isolatedDeclarations: true` and `declaration: true` to TSConfigs.
- Add explicit type annotations to exported components, functions, and command definitions to satisfy isolated declarations requirements.
- Downgrade TypeScript in `docs` package to `^6.0.3` to avoid Astro check crash on native TypeScript.
