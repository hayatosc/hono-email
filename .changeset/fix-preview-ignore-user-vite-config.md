---
'@hono-email/preview': patch
---

Stop the preview server from auto-loading the user's `vite.config.*`. Previously Vite discovered and merged the project's config into the preview server's internal Vite instance, so foreign plugins (e.g. `@cloudflare/vite-plugin`) broke the preview. The preview server now always runs with its own self-contained plugin set (`configFile: false`); settings from the project's Vite config (such as `resolve.alias`) no longer apply to the preview.
