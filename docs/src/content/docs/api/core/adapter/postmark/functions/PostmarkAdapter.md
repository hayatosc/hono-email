---
editUrl: false
next: false
prev: false
title: 'PostmarkAdapter'
---

> **PostmarkAdapter**(`options`): [`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

Defined in: [adapter/postmark/index.ts:253](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/postmark/index.ts#L253)

Creates an adapter for the Postmark Email API.

## Parameters

### options

[`PostmarkAdapterOptions`](/api/core/adapter/postmark/type-aliases/postmarkadapteroptions/)

Postmark adapter options.

## Returns

[`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

An email adapter that sends through Postmark.

## Example

```tsx
const adapter = PostmarkAdapter({ serverToken: process.env.POSTMARK_SERVER_TOKEN! })
```
