---
editUrl: false
next: false
prev: false
title: 'CloudflareEmailRestPayload'
---

> **CloudflareEmailRestPayload** = `object`

Defined in: [adapter/cloudflare/types.ts:56](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L56)

## Properties

### attachments?

> `optional` **attachments?**: [`CloudflareEmailRestAttachment`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailrestattachment/)[]

Defined in: [adapter/cloudflare/types.ts:57](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L57)

---

### bcc?

> `optional` **bcc?**: [`CloudflareEmailRecipientField`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailrecipientfield/)

Defined in: [adapter/cloudflare/types.ts:58](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L58)

---

### cc?

> `optional` **cc?**: [`CloudflareEmailRecipientField`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailrecipientfield/)

Defined in: [adapter/cloudflare/types.ts:59](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L59)

---

### from

> **from**: `string` \| [`CloudflareEmailNameAddress`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailnameaddress/)

Defined in: [adapter/cloudflare/types.ts:60](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L60)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [adapter/cloudflare/types.ts:61](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L61)

---

### html

> **html**: `string`

Defined in: [adapter/cloudflare/types.ts:62](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L62)

---

### reply_to?

> `optional` **reply_to?**: `string`

Defined in: [adapter/cloudflare/types.ts:63](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L63)

---

### subject

> **subject**: `string`

Defined in: [adapter/cloudflare/types.ts:64](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L64)

---

### text

> **text**: `string`

Defined in: [adapter/cloudflare/types.ts:65](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L65)

---

### to

> **to**: [`CloudflareEmailRecipientField`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailrecipientfield/)

Defined in: [adapter/cloudflare/types.ts:66](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L66)
