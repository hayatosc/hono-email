---
'@hono-email/tailwind-plugin': minor
---

Compile Tailwind CSS with the Node compiler and candidate scanner at build time, then inject serialized artifacts instead of relying on host CSS `?inline` support or runtime artifact building. Preserve the runtime artifact format, custom CSS, config dependencies, safelists, and automatic source discovery across all eight bundler integrations. Invalidate compiler caches and artifact modules for watch builds and Vite development updates.

The low-level `buildPerFileArtifactModule` helper is now asynchronous and accepts compilation options. The deprecated `runtimeModuleSpecifier` option is retained but no longer generates a runtime import.
