---
editUrl: false
next: false
prev: false
title: 'SmtpConnector'
---

> **SmtpConnector** = `object`

Defined in: [adapter/smtp/types.ts:90](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L90)

Runtime-specific socket connector used by `SmtpTransport`.

## Example

```ts
const connector: SmtpConnector = {
  connect(address, options) {
    return openSocket(address, options)
  },
}
```

## Methods

### connect()

> **connect**(`address`, `options`): [`SmtpSocket`](/api/core/adapter/smtp/type-aliases/smtpsocket/) \| `Promise`\<[`SmtpSocket`](/api/core/adapter/smtp/type-aliases/smtpsocket/)\>

Defined in: [adapter/smtp/types.ts:91](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L91)

Opens an SMTP socket for the given address and options.

#### Parameters

##### address

[`SmtpSocketAddress`](/api/core/adapter/smtp/type-aliases/smtpsocketaddress/)

##### options

[`SmtpConnectorOptions`](/api/core/adapter/smtp/type-aliases/smtpconnectoroptions/)

#### Returns

[`SmtpSocket`](/api/core/adapter/smtp/type-aliases/smtpsocket/) \| `Promise`\<[`SmtpSocket`](/api/core/adapter/smtp/type-aliases/smtpsocket/)\>
