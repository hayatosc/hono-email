---
'hono-email': patch
---

- Fix HTMLRewriter parsing crash caused by self-closing meta tags in layout components.
- Fix HTML splitting bug in TOKEN_PATTERN parser when quotes contain `>` characters in Preview relocate logic.
- Robust case/whitespace-insensitive style property verification in validateStyleTags.
- Support custom AbortSignal propagation in fetchWithTimeoutAndRetry without overwriting timeouts.
- Enable HTTP 429 Too Many Requests retry logic and parse Retry-After headers in adapters.
- Consume and cancel response bodies during retries to prevent connection pinning.
