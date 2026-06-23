---
editUrl: false
next: false
prev: false
title: 'SmtpConnectorOptions'
---

> **SmtpConnectorOptions** = `object`

Defined in: [adapter/smtp/types.ts:44](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L44)

Connection options passed from `SmtpTransport` to a runtime connector.

## Example

```ts
const options: SmtpConnectorOptions = { secureTransport: 'starttls' }
```

## Properties

### secureTransport

> **secureTransport**: [`SmtpSecureTransport`](/api/core/adapter/smtp/type-aliases/smtpsecuretransport/)

Defined in: [adapter/smtp/types.ts:45](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L45)

Resolved SMTP TLS mode.
