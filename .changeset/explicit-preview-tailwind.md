---
'@hono-email/preview': patch
---

Add a `tailwind` API option (`true`, `false`, or `'auto'`) and `--tailwind on|off|auto` CLI control. Keep automatic detection as the default, exclude generic PostCSS configs, and report a missing email plugin peer from the user's project. Preview now registers only the email Tailwind plugin (requiring version 0.9.0 or later), preserves project theme configuration, and exposes `tailwindcss` as an optional peer for discovery instead of installing host Tailwind Vite CSS processing. The email plugin's dependencies control the compiler version.

Preserve native Fetch globals when starting the HTTP adapter and select Bun's native HTMLRewriter entry during preview SSR to prevent empty Tailwind render output.
