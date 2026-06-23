---
editUrl: false
next: false
prev: false
title: 'EmailAdapter'
---

> **EmailAdapter** = `object`

Defined in: [email.ts:199](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L199)

Transport interface implemented by SMTP, Cloudflare Email Service, or custom adapters.

## Example

```ts
const adapter: EmailAdapter = {
  async send(message) {
    return deliver(message)
  },
}
```

## Methods

### send()

> **send**(`message`): `Promise`\<[`SendEmailReceipt`](/api/core/index/type-aliases/sendemailreceipt/)\>

Defined in: [email.ts:200](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L200)

Sends a fully rendered message and returns a receipt.

#### Parameters

##### message

[`EmailMessage`](/api/core/index/type-aliases/emailmessage/)

#### Returns

`Promise`\<[`SendEmailReceipt`](/api/core/index/type-aliases/sendemailreceipt/)\>
