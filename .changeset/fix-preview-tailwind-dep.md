---
'@hono-email/preview': patch
---

Fix the `@hono-email/tailwind-plugin` dependency issue in `@hono-email/preview` by declaring it as an optional peerDependency and adding clean error handling if import fails at runtime.
