---
'hono-email': minor
---

Add `createMailer()` client to configure reusable default sender options (`adapter`, `from`, `replyTo`, `headers`, `render`, `retry`) and type-safe `defineMail()` for defining reusable mailables (`Mailable<TData>`). Includes `mailer.send()` with automatic mailable building or direct drafts, `mailer.render()` for preview and unit testing without delivery, and `isMailable()` runtime type guard.
