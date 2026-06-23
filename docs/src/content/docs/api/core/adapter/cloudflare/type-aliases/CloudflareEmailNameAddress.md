---
editUrl: false
next: false
prev: false
title: 'CloudflareEmailNameAddress'
---

> **CloudflareEmailNameAddress** = `object`

Defined in: [adapter/cloudflare/types.ts:17](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L17)

Name/address object shape used by the Cloudflare Email REST API payload.

## Example

```ts
const from: CloudflareEmailNameAddress = {
  address: 'sender@example.com',
  name: 'Sender',
}
```

## Properties

### address

> **address**: `string`

Defined in: [adapter/cloudflare/types.ts:18](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L18)

Email address path.

---

### name?

> `optional` **name?**: `string`

Defined in: [adapter/cloudflare/types.ts:19](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L19)

Optional display name.
