---
'hono-email': minor
---

Add `hono-email/testing` entrypoint with `InMemoryAdapter`, `FileAdapter`, and `LogAdapter`:

- `InMemoryAdapter`: Records sent emails in memory with `assertSent` and `assertNotSent` helpers, `mail.link()` (with HTML entity decoding and relative URL support), `mail.attachment()`, `failNext()`, and query filters.
- `FileAdapter`: Writes sent emails as RFC 5322 `.eml` files to disk for local email client preview.
- `LogAdapter`: Outputs formatted email delivery summaries and optional body contents to the console or a custom logger.
