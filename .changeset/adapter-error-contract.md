---
'hono-email': patch
---

Keep SMTP connector failures in failed delivery receipts even when their message matches a closed transport error, and document the built-in adapter error contract.

Export `SmtpTransportClosedError` from `hono-email/smtp` and set its error name so consumers can identify closed-transport lifecycle rejections with `instanceof` and in logs.
