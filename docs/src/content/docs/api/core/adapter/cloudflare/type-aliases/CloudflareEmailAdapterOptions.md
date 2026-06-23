---
editUrl: false
next: false
prev: false
title: 'CloudflareEmailAdapterOptions'
---

> **CloudflareEmailAdapterOptions** = `object`

Defined in: [adapter/cloudflare/types.ts:182](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L182)

Options for creating a Cloudflare Email Service adapter.

## Example

```ts
const adapter = CloudflareEmailAdapter({
  connector: RESTConnector({ accountId, apiToken }),
})
```

## Properties

### connector

> **connector**: [`CloudflareEmailConnector`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailconnector/)

Defined in: [adapter/cloudflare/types.ts:183](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L183)

Cloudflare Email connector.

---

### limits?

> `optional` **limits?**: [`EmailAttachmentLimits`](/api/core/index/type-aliases/emailattachmentlimits/)

Defined in: [adapter/cloudflare/types.ts:184](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L184)

Attachment limits.
