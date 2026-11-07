---
'hono-email': minor
---

Support `signal?: AbortSignal` and `retry?: RequestRetryOptions | boolean` in `EmailSendOptions` and `SendEmailOptions`, propagating across all built-in delivery adapters (`ResendAdapter`, `SendGridAdapter`, `PostmarkAdapter`, `MailgunAdapter`, `CloudflareEmailAdapter`, `SesAdapter`, `SmtpTransport`, and testing adapters). Includes immediate cancellation during retry sleep (`sleepWithSignal`), full jitter exponential backoff (`jitter: 'full'`), and capping `Retry-After` headers to `maxInterval`.
