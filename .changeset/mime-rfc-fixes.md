---
'hono-email': patch
---

Keep generated MIME headers within RFC line limits, compute the correct DKIM hash for empty bodies, and reject oversized SMTP response buffers. Long custom or attachment header values that cannot be folded below the RFC line limit now fail clearly instead of producing malformed messages.
