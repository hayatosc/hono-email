---
'hono-email': minor
---

Add observability and telemetry support with lifecycle event hooks (`onSent`, `onFailed`, `onEvent`) and automatic `node:diagnostics_channel` integration (`hono-email:sent`, `hono-email:failed`). Telemetry hooks report `durationMs`, `messageId`, `subject`, `recipients`, `permanent`, `receipt`, and `message` across both `sendEmail()` and `createMailer()`.
