---
'@hono-email/preview': patch
---

Drive template hot-reload through Vite's Environment API module graph. Editing a shared component imported by a template (outside the templates directory) now refreshes the preview, which the previous `templateDir`-only file check missed.
