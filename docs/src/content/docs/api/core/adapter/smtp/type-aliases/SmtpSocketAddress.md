---
editUrl: false
next: false
prev: false
title: 'SmtpSocketAddress'
---

> **SmtpSocketAddress** = `object`

Defined in: [adapter/smtp/types.ts:29](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L29)

Host and port used by an SMTP connector.

## Example

```ts
const address: SmtpSocketAddress = { hostname: 'smtp.example.com', port: 587 }
```

## Properties

### hostname

> **hostname**: `string`

Defined in: [adapter/smtp/types.ts:30](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L30)

SMTP server host name.

---

### port

> **port**: `number`

Defined in: [adapter/smtp/types.ts:31](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L31)

SMTP server port.
