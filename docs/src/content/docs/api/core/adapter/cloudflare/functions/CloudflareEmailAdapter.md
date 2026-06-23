---
editUrl: false
next: false
prev: false
title: 'CloudflareEmailAdapter'
---

> **CloudflareEmailAdapter**(`options`): [`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

Defined in: [adapter/cloudflare/adapter.ts:212](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/cloudflare/adapter.ts#L212)

Creates an adapter for Cloudflare Email Service.

## Parameters

### options

[`CloudflareEmailAdapterOptions`](/api/core/adapter/cloudflare/type-aliases/cloudflareemailadapteroptions/)

Cloudflare Email adapter options.

## Returns

[`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

An email adapter that sends through Cloudflare Email Service.

## Example

```tsx
const adapter = CloudflareEmailAdapter({
  connector: RESTConnector({ accountId, apiToken }),
})

await sendEmail({
  adapter,
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Welcome',
  jsx: (
    <Html>
      <Body>
        <Text>Hello</Text>
      </Body>
    </Html>
  ),
})
```
