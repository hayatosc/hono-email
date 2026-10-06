---
'hono-email': patch
---

Add SMTP-specific per-send DKIM configuration through `SmtpTransport.send(message, options)` and export `SmtpSendOptions` from `hono-email/smtp`. Per-send DKIM takes precedence over legacy `message.dkim` and transport defaults without changing later sends.

Deprecate, but retain, `EmailMessage.dkim` for backward compatibility. Document migration to SMTP send options and clarify that HTTP provider adapters do not apply local DKIM settings; signing is configured with the provider.
