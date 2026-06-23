---
editUrl: false
next: false
prev: false
title: 'MailgunAdapter'
---

> **MailgunAdapter**(`options`): [`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

Defined in: [adapter/mailgun/index.ts:247](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/mailgun/index.ts#L247)

Creates an adapter for the Mailgun Messages API.

## Parameters

### options

[`MailgunAdapterOptions`](/api/core/adapter/mailgun/type-aliases/mailgunadapteroptions/)

Mailgun adapter options.

## Returns

[`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

An email adapter that sends through Mailgun.

## Example

```tsx
const adapter = MailgunAdapter({
  apiKey: process.env.MAILGUN_API_KEY!,
  domain: process.env.MAILGUN_DOMAIN!,
})
```
