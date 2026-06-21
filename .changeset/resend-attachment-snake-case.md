---
'hono-email': patch
---

Fix Resend adapter sending `contentId` (camelCase) instead of `content_id` (snake_case) in attachment payloads.

The Resend API requires `content_id` and `content_type` (snake_case) in attachment objects, matching the shape documented in [resend-openapi](https://github.com/resend/resend-openapi) and the official Node SDK. The previous camelCase field was silently ignored by the API, causing inline image embedding via `cid:` references to silently fail.

- **Fix:** attachment `contentId` is now correctly sent as `content_id`
- **Fix:** attachment MIME type is now sent as `content_type` (previously omitted)
- **Fix:** `ResendErrorResponse.type` removed — the Resend API only returns `name`, not `type`
