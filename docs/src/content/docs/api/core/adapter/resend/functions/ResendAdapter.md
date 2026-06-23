---
editUrl: false
next: false
prev: false
title: 'ResendAdapter'
---

> **ResendAdapter**(`options`): [`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

Defined in: [adapter/resend/index.ts:154](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/resend/index.ts#L154)

Creates an adapter for the Resend Email API.

## Parameters

### options

[`ResendAdapterOptions`](/api/core/adapter/resend/type-aliases/resendadapteroptions/)

Resend adapter options.

## Returns

[`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

An email adapter that sends through Resend.

## Example

```tsx
const adapter = ResendAdapter({ apiKey: 're_xxxxxxxxx' })
```
