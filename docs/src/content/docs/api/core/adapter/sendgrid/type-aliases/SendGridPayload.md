---
editUrl: false
next: false
prev: false
title: 'SendGridPayload'
---

> **SendGridPayload** = `object`

Defined in: [adapter/sendgrid/index.ts:44](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/sendgrid/index.ts#L44)

## Properties

### attachments?

> `optional` **attachments?**: [`SendGridAttachment`](/api/core/adapter/sendgrid/type-aliases/sendgridattachment/)[]

Defined in: [adapter/sendgrid/index.ts:57](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/sendgrid/index.ts#L57)

---

### content

> **content**: \[\{ `type`: `"text/plain"`; `value`: `string`; \}, \{ `type`: `"text/html"`; `value`: `string`; \}\]

Defined in: [adapter/sendgrid/index.ts:56](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/sendgrid/index.ts#L56)

---

### from

> **from**: [`SendGridMailAddress`](/api/core/adapter/sendgrid/type-aliases/sendgridmailaddress/)

Defined in: [adapter/sendgrid/index.ts:54](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/sendgrid/index.ts#L54)

---

### personalizations

> **personalizations**: \[\{ `bcc?`: [`SendGridMailAddress`](/api/core/adapter/sendgrid/type-aliases/sendgridmailaddress/)[]; `cc?`: [`SendGridMailAddress`](/api/core/adapter/sendgrid/type-aliases/sendgridmailaddress/)[]; `headers?`: `Record`\<`string`, `string`\>; `subject?`: `string`; `to`: [`SendGridMailAddress`](/api/core/adapter/sendgrid/type-aliases/sendgridmailaddress/)[]; \}\]

Defined in: [adapter/sendgrid/index.ts:45](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/sendgrid/index.ts#L45)

---

### reply_to?

> `optional` **reply_to?**: [`SendGridMailAddress`](/api/core/adapter/sendgrid/type-aliases/sendgridmailaddress/)

Defined in: [adapter/sendgrid/index.ts:58](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/sendgrid/index.ts#L58)

---

### reply_to_list?

> `optional` **reply_to_list?**: [`SendGridMailAddress`](/api/core/adapter/sendgrid/type-aliases/sendgridmailaddress/)[]

Defined in: [adapter/sendgrid/index.ts:59](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/sendgrid/index.ts#L59)

---

### subject

> **subject**: `string`

Defined in: [adapter/sendgrid/index.ts:55](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/sendgrid/index.ts#L55)
