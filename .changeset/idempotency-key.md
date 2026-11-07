---
'hono-email': minor
---

Support `idempotencyKey` in `EmailMessage` and `EmailDraft`. For SMTP and raw MIME sends, `idempotencyKey` derives a deterministic RFC 5322 `Message-ID` when `messageId` is omitted. For `ResendAdapter`, `idempotencyKey` is forwarded via the `Idempotency-Key` HTTP header with Latin-1 character and length validation (up to 256 characters) for 24-hour deduplication.
