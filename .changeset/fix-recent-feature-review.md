---
'hono-email': patch
'@hono-email/preview': patch
---

Fix issues in recently added features: Ed25519 DKIM now signs the SHA-256 hash of the header data as RFC 8463 requires; `SmtpTransport` returns a validation receipt instead of throwing for invalid addresses and no longer leaks a pooled connection when a queued send is aborted; `withDeliveryRules` applies suppression and intercept checks to SMTP envelope recipients; `FallbackAdapter` ignores errors thrown by `onFallback` and stops falling back once the send is aborted; header maps (including generated `List-Unsubscribe` headers) merge case-insensitively; single-address parse errors are classified as validation errors; and the preview server rejects non-string remote attachment sources and unsafe `contentType` values when inlining `cid:` images.
