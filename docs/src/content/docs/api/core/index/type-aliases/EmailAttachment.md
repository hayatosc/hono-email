---
editUrl: false
next: false
prev: false
title: 'EmailAttachment'
---

> **EmailAttachment** = `object`

Defined in: [email.ts:53](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L53)

Attachment source and metadata for an email message.

## Example

```ts
const attachment: EmailAttachment = {
  filename: 'invoice.txt',
  content: 'Invoice text',
  contentType: 'text/plain',
}
```

## Properties

### cid?

> `optional` **cid?**: `string`

Defined in: [email.ts:61](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L61)

Content ID for inline attachments.

---

### content?

> `optional` **content?**: [`EmailAttachmentContent`](/api/core/index/type-aliases/emailattachmentcontent/)

Defined in: [email.ts:55](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L55)

In-memory attachment content.

---

### contentDisposition?

> `optional` **contentDisposition?**: [`EmailAttachmentDisposition`](/api/core/index/type-aliases/emailattachmentdisposition/)

Defined in: [email.ts:60](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L60)

Attachment disposition. Defaults to `attachment`.

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [email.ts:59](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L59)

MIME content type.

---

### encoding?

> `optional` **encoding?**: [`EmailAttachmentEncoding`](/api/core/index/type-aliases/emailattachmentencoding/)

Defined in: [email.ts:62](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L62)

Encoding for string content.

---

### filename?

> `optional` **filename?**: `string`

Defined in: [email.ts:54](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L54)

Attachment filename.

---

### headers?

> `optional` **headers?**: [`EmailHeaders`](/api/core/index/type-aliases/emailheaders/)

Defined in: [email.ts:63](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L63)

---

### href?

> `optional` **href?**: `string`

Defined in: [email.ts:57](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L57)

Remote URL to fetch as attachment content.

---

### httpHeaders?

> `optional` **httpHeaders?**: [`EmailHeaders`](/api/core/index/type-aliases/emailheaders/)

Defined in: [email.ts:58](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L58)

---

### path?

> `optional` **path?**: `string`

Defined in: [email.ts:56](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L56)

Remote URL or data URI to resolve as attachment content. Local files must be
read by user code and passed as `content`.
