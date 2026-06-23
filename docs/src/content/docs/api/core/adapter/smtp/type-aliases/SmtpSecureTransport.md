---
editUrl: false
next: false
prev: false
title: 'SmtpSecureTransport'
---

> **SmtpSecureTransport** = `"off"` \| `"on"` \| `"starttls"`

Defined in: [adapter/smtp/types.ts:16](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L16)

SMTP TLS mode. `true` maps to `on`, `false` maps to `off`, and `'starttls'` upgrades after EHLO.

## Example

```ts
const secure: SmtpSecureTransport = 'starttls'
```
