---
editUrl: false
next: false
prev: false
title: 'SmtpAuth'
---

> **SmtpAuth** = \{ `password`: `string`; `type?`: `"plain"`; `username`: `string`; \} \| \{ `password`: `string`; `type`: `"login"`; `username`: `string`; \}

Defined in: [adapter/smtp/types.ts:112](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L112)

SMTP authentication configuration.

## Example

```ts
const auth: SmtpAuth = {
  username: 'smtp-user',
  password: 'smtp-password',
}
```
