---
editUrl: false
next: false
prev: false
title: 'CloudflareEmailBinding'
---

> **CloudflareEmailBinding** = `object`

Defined in: [adapter/cloudflare/types.ts:91](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L91)

## Methods

### send()

#### Call Signature

> **send**(`message`): `Promise`\<[`CloudflareEmailBindingSendResult`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailbindingsendresult/)\>

Defined in: [adapter/cloudflare/types.ts:92](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L92)

##### Parameters

###### message

`CloudflareEmailBindingMessage`

##### Returns

`Promise`\<[`CloudflareEmailBindingSendResult`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailbindingsendresult/)\>

#### Call Signature

> **send**(`builder`): `Promise`\<[`CloudflareEmailBindingSendResult`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailbindingsendresult/)\>

Defined in: [adapter/cloudflare/types.ts:93](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/types.ts#L93)

##### Parameters

###### builder

[`CloudflareEmailWorkerPayload`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailworkerpayload/)

##### Returns

`Promise`\<[`CloudflareEmailBindingSendResult`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailbindingsendresult/)\>
