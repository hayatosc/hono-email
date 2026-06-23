---
editUrl: false
next: false
prev: false
title: 'RESTConnector'
---

> **RESTConnector**(`options`): [`CloudflareEmailConnector`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailconnector/)

Defined in: [adapter/cloudflare/rest.ts:109](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/rest.ts#L109)

Creates a Cloudflare Email REST API connector.

## Parameters

### options

[`CloudflareEmailRestConnectorOptions`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailrestconnectoroptions/)

REST API account, token, and optional fetch settings.

## Returns

[`CloudflareEmailConnector`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailconnector/)

A Cloudflare Email connector.

## Example

```ts
const connector = RESTConnector({
  accountId: 'account-id',
  apiToken: 'api-token',
})
```
