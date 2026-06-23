---
editUrl: false
next: false
prev: false
title: 'SmtpTransportOptions'
---

> **SmtpTransportOptions** = `object`

Defined in: [adapter/smtp/types.ts:150](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L150)

Options for creating an `SmtpTransport`.

## Example

```ts
const transport = new SmtpTransport({
  connector,
  hostname: 'smtp.example.com',
  port: 587,
  secure: 'starttls',
})
```

## Properties

### auth?

> `optional` **auth?**: [`SmtpAuth`](/api/core/adapter/smtp/type-aliases/smtpauth/)

Defined in: [adapter/smtp/types.ts:155](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L155)

Optional SMTP authentication.

---

### clientName?

> `optional` **clientName?**: `string`

Defined in: [adapter/smtp/types.ts:157](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L157)

EHLO/HELO client name.

---

### connectionTimeout?

> `optional` **connectionTimeout?**: `number`

Defined in: [adapter/smtp/types.ts:158](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L158)

Connection timeout in milliseconds.

---

### connector

> **connector**: [`SmtpConnector`](/api/core/adapter/smtp/type-aliases/smtpconnector/)

Defined in: [adapter/smtp/types.ts:151](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L151)

Runtime-specific socket connector.

---

### dkim?

> `optional` **dkim?**: [`EmailDkimOptions`](/api/core/index/type-aliases/emaildkimoptions/)

Defined in: [adapter/smtp/types.ts:156](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L156)

Optional DKIM signing options.

---

### greetingTimeout?

> `optional` **greetingTimeout?**: `number`

Defined in: [adapter/smtp/types.ts:159](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L159)

Greeting timeout in milliseconds.

---

### hostname

> **hostname**: `string`

Defined in: [adapter/smtp/types.ts:152](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L152)

SMTP server host name.

---

### limits?

> `optional` **limits?**: [`EmailAttachmentLimits`](/api/core/index/type-aliases/emailattachmentlimits/)

Defined in: [adapter/smtp/types.ts:161](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L161)

Attachment limits.

---

### pool?

> `optional` **pool?**: `object`

Defined in: [adapter/smtp/types.ts:162](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L162)

SMTP connection pool settings.

#### maxConnections?

> `optional` **maxConnections?**: `number`

#### maxMessages?

> `optional` **maxMessages?**: `number`

---

### port

> **port**: `number`

Defined in: [adapter/smtp/types.ts:153](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L153)

SMTP server port.

---

### secure?

> `optional` **secure?**: `boolean` \| `"starttls"`

Defined in: [adapter/smtp/types.ts:154](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L154)

TLS mode. `true` uses implicit TLS, `'starttls'` upgrades after EHLO.

---

### socketTimeout?

> `optional` **socketTimeout?**: `number`

Defined in: [adapter/smtp/types.ts:160](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L160)

SMTP response timeout in milliseconds.
