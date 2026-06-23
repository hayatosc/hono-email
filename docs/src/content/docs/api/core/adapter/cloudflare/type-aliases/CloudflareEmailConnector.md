---
editUrl: false
next: false
prev: false
title: 'CloudflareEmailConnector'
---

> **CloudflareEmailConnector** = `object`

Defined in: [adapter/cloudflare/types.ts:124](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L124)

Connector interface used by `CloudflareEmailAdapter`.

## Example

```ts
const connector: CloudflareEmailConnector = {
  async send(request) {
    return sendWithRuntime(request)
  },
}
```

## Methods

### send()

> **send**(`request`): [`CloudflareEmailConnectorResult`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailconnectorresult/) \| `Promise`\<[`CloudflareEmailConnectorResult`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailconnectorresult/)\>

Defined in: [adapter/cloudflare/types.ts:125](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L125)

Sends a prepared Cloudflare Email connector request.

#### Parameters

##### request

[`CloudflareEmailConnectorRequest`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailconnectorrequest/)

#### Returns

[`CloudflareEmailConnectorResult`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailconnectorresult/) \| `Promise`\<[`CloudflareEmailConnectorResult`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailconnectorresult/)\>
