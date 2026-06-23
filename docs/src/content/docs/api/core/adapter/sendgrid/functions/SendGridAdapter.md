---
editUrl: false
next: false
prev: false
title: 'SendGridAdapter'
---

> **SendGridAdapter**(`options`): [`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

Defined in: [adapter/sendgrid/index.ts:251](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/sendgrid/index.ts#L251)

Creates an adapter for the Twilio SendGrid Mail Send API.

## Parameters

### options

[`SendGridAdapterOptions`](/api/core/adapter/sendgrid/type-aliases/sendgridadapteroptions/)

SendGrid adapter options.

## Returns

[`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

An email adapter that sends through SendGrid.

## Example

```tsx
const adapter = SendGridAdapter({ apiKey: process.env.SENDGRID_API_KEY! })
```
