---
editUrl: false
next: false
prev: false
title: 'EmailMessage'
---

> **EmailMessage** = `object`

Defined in: [email.ts:126](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L126)

Fully rendered email message passed to an adapter.

## Example

```ts
const message: EmailMessage = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Welcome',
  html: '<p>Hello</p>',
  text: 'Hello',
}
```

## Properties

### attachments?

> `optional` **attachments?**: [`EmailAttachment`](/api/core/index/type-aliases/emailattachment/)[]

Defined in: [email.ts:135](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L135)

Optional message attachments.

---

### bcc?

> `optional` **bcc?**: [`EmailAddress`](/api/core/index/type-aliases/emailaddress/) \| [`EmailAddress`](/api/core/index/type-aliases/emailaddress/)[]

Defined in: [email.ts:130](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L130)

---

### cc?

> `optional` **cc?**: [`EmailAddress`](/api/core/index/type-aliases/emailaddress/) \| [`EmailAddress`](/api/core/index/type-aliases/emailaddress/)[]

Defined in: [email.ts:129](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L129)

---

### date?

> `optional` **date?**: `Date`

Defined in: [email.ts:138](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L138)

---

### dkim?

> `optional` **dkim?**: [`EmailDkimOptions`](/api/core/index/type-aliases/emaildkimoptions/)

Defined in: [email.ts:140](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L140)

---

### envelope?

> `optional` **envelope?**: [`EmailEnvelope`](/api/core/index/type-aliases/emailenvelope/)

Defined in: [email.ts:139](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L139)

Optional SMTP envelope override.

---

### from

> **from**: [`EmailAddress`](/api/core/index/type-aliases/emailaddress/)

Defined in: [email.ts:127](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L127)

Visible sender address.

---

### headers?

> `optional` **headers?**: [`EmailHeaders`](/api/core/index/type-aliases/emailheaders/)

Defined in: [email.ts:136](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L136)

Optional custom headers.

---

### html

> **html**: `string`

Defined in: [email.ts:133](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L133)

Rendered HTML body.

---

### messageId?

> `optional` **messageId?**: `string`

Defined in: [email.ts:137](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L137)

---

### replyTo?

> `optional` **replyTo?**: [`EmailAddress`](/api/core/index/type-aliases/emailaddress/) \| [`EmailAddress`](/api/core/index/type-aliases/emailaddress/)[]

Defined in: [email.ts:131](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L131)

---

### subject

> **subject**: `string`

Defined in: [email.ts:132](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L132)

Message subject.

---

### text

> **text**: `string`

Defined in: [email.ts:134](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L134)

Plain-text body.

---

### to

> **to**: [`EmailAddress`](/api/core/index/type-aliases/emailaddress/) \| [`EmailAddress`](/api/core/index/type-aliases/emailaddress/)[]

Defined in: [email.ts:128](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L128)

Visible recipient address or addresses.
