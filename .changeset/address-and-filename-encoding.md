---
'hono-email': minor
---

Support display-name formatted string addresses (`'Ada Lovelace <ada@example.com>'`, `'"Orders, Inc." <orders@example.com>'`) across adapters, prevent comma-injection attacks, and encode non-ASCII attachment filenames using RFC 2231 / RFC 5987 (`filename*` and `name*` parameters).
