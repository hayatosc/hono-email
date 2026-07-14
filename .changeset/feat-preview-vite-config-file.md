---
'@hono-email/preview': minor
---

Add a `-f, --file <path>` CLI option to `hono-email preview` to explicitly opt in to loading a Vite config file into the preview server. The default remains not loading any config, per the `configFile: false` fix. If the loaded config already registers a Tailwind CSS plugin, the preview server's built-in Tailwind auto-detection is skipped to avoid registering it twice.
