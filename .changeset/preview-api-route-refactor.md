---
'@hono-email/preview': patch
---

Refactor the preview API routes to use Hono middleware and centralized error handling. Template lookup, module loading, and component resolution now run once per request in a shared middleware, and unexpected errors are mapped through `app.onError`. Response shapes and status codes are unchanged.
