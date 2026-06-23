---
editUrl: false
next: false
prev: false
title: 'SmtpTransport'
---

Defined in: [adapter/smtp/index.ts:83](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/index.ts#L83)

SMTP email adapter with optional pooling, STARTTLS, AUTH, attachments, and DKIM signing.

## Param

**options**

SMTP transport options.

## Example

```tsx
const smtp = new SmtpTransport({
  connector: nodeSmtpConnector,
  hostname: 'smtp.example.com',
  port: 587,
  secure: 'starttls',
  auth: { username: 'smtp-user', password: 'smtp-password' },
})

await sendEmail({
  adapter: smtp,
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Welcome',
  jsx: (
    <Html>
      <Body>
        <Text>Hello</Text>
      </Body>
    </Html>
  ),
})
```

## Implements

- [`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

## Constructors

### Constructor

> **new SmtpTransport**(`options`): `SmtpTransport`

Defined in: [adapter/smtp/index.ts:103](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/index.ts#L103)

#### Parameters

##### options

[`SmtpTransportOptions`](/api/core/adapter/smtp/type-aliases/smtptransportoptions/)

#### Returns

`SmtpTransport`

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [adapter/smtp/index.ts:134](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/index.ts#L134)

#### Returns

`Promise`\<`void`\>

---

### send()

> **send**(`message`): `Promise`\<[`SendEmailReceipt`](/api/core/index/type-aliases/sendemailreceipt/)\>

Defined in: [adapter/smtp/index.ts:119](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/index.ts#L119)

#### Parameters

##### message

[`EmailMessage`](/api/core/index/type-aliases/emailmessage/)

#### Returns

`Promise`\<[`SendEmailReceipt`](/api/core/index/type-aliases/sendemailreceipt/)\>

#### Implementation of

`EmailAdapter.send`

---

### verify()

> **verify**(): `Promise`\<`void`\>

Defined in: [adapter/smtp/index.ts:154](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/index.ts#L154)

#### Returns

`Promise`\<`void`\>
