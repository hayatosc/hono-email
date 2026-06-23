---
editUrl: false
next: false
prev: false
title: 'CloudflareEmailWorkerPayload'
---

> **CloudflareEmailWorkerPayload** = `object`

Defined in: [adapter/cloudflare/types.ts:69](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L69)

## Properties

### attachments?

> `optional` **attachments?**: [`CloudflareEmailWorkerAttachment`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailworkerattachment/)[]

Defined in: [adapter/cloudflare/types.ts:70](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L70)

---

### bcc?

> `optional` **bcc?**: [`CloudflareEmailRecipientField`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailrecipientfield/)

Defined in: [adapter/cloudflare/types.ts:71](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L71)

---

### cc?

> `optional` **cc?**: [`CloudflareEmailRecipientField`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailrecipientfield/)

Defined in: [adapter/cloudflare/types.ts:72](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L72)

---

### from

> **from**: `string` \| [`CloudflareEmailWorkerNameAddress`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailworkernameaddress/)

Defined in: [adapter/cloudflare/types.ts:73](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L73)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [adapter/cloudflare/types.ts:74](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L74)

---

### html

> **html**: `string`

Defined in: [adapter/cloudflare/types.ts:75](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L75)

---

### replyTo?

> `optional` **replyTo?**: `string` \| [`CloudflareEmailWorkerNameAddress`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailworkernameaddress/)

Defined in: [adapter/cloudflare/types.ts:76](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L76)

---

### subject

> **subject**: `string`

Defined in: [adapter/cloudflare/types.ts:77](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L77)

---

### text

> **text**: `string`

Defined in: [adapter/cloudflare/types.ts:78](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L78)

---

### to

> **to**: [`CloudflareEmailRecipientField`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailrecipientfield/)

Defined in: [adapter/cloudflare/types.ts:79](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L79)
