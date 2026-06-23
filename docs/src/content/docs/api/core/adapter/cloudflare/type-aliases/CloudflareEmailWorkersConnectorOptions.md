---
editUrl: false
next: false
prev: false
title: 'CloudflareEmailWorkersConnectorOptions'
---

> **CloudflareEmailWorkersConnectorOptions** = `object`

Defined in: [adapter/cloudflare/types.ts:165](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L165)

Options for resolving a Cloudflare Workers Email binding.

## Example

```ts
const options: CloudflareEmailWorkersConnectorOptions = {
  bindingName: 'EMAIL',
}
```

## Properties

### bindingName?

> `optional` **bindingName?**: `string`

Defined in: [adapter/cloudflare/types.ts:166](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L166)

Workers binding name. Defaults to `EMAIL`.
