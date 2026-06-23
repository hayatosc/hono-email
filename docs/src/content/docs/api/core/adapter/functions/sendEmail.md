---
editUrl: false
next: false
prev: false
title: 'sendEmail'
---

> **sendEmail**(`options`): `Promise`\<[`SendEmailReceipt`](/api/core/index/type-aliases/sendemailreceipt/)\>

Defined in: [adapter/index.ts:64](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/index.ts#L64)

Renders and sends a JSX email draft through the provided adapter.

## Parameters

### options

[`SendEmailOptions`](/api/core/index/type-aliases/sendemailoptions/)

Email draft and delivery adapter.

## Returns

`Promise`\<[`SendEmailReceipt`](/api/core/index/type-aliases/sendemailreceipt/)\>

Delivery receipt from the adapter.

## Example

```tsx
const receipt = await sendEmail({
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
