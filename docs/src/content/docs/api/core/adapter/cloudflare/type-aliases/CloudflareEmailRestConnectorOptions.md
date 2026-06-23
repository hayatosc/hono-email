---
editUrl: false
next: false
prev: false
title: 'CloudflareEmailRestConnectorOptions'
---

> **CloudflareEmailRestConnectorOptions** = `object`

Defined in: [adapter/cloudflare/types.ts:146](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L146)

Options for the Cloudflare Email REST API connector.

## Example

```ts
const options: CloudflareEmailRestConnectorOptions = {
  accountId: 'account-id',
  apiToken: 'api-token',
}
```

## Properties

### accountId

> **accountId**: `string`

Defined in: [adapter/cloudflare/types.ts:147](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L147)

Cloudflare account ID.

---

### apiBaseUrl?

> `optional` **apiBaseUrl?**: `string`

Defined in: [adapter/cloudflare/types.ts:148](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L148)

Optional API base URL override.

---

### apiToken

> **apiToken**: `string`

Defined in: [adapter/cloudflare/types.ts:149](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L149)

Cloudflare API token.

---

### fetch?

> `optional` **fetch?**: [`CloudflareEmailFetch`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailfetch/)

Defined in: [adapter/cloudflare/types.ts:150](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L150)

Optional fetch implementation.
