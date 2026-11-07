---
'hono-email': minor
---

Support `recipientRejectionPolicy?: SmtpRecipientRejectionPolicy` (`'deliver-accepted' | 'reject-all'`) in `SmtpTransportOptions` and `SmtpSendOptions`. When set to `'reject-all'`, the SMTP transport issues an `RSET` command and aborts delivery without sending `DATA` if any recipient is rejected during `RCPT TO`, returning a failed receipt with `category: 'recipients_rejected'` to prevent duplicate delivery upon retry.
