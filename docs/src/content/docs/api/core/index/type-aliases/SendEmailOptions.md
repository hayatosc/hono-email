---
editUrl: false
next: false
prev: false
title: 'SendEmailOptions'
---

> **SendEmailOptions** = [`EmailMessageDraft`](/api/core/index/type-aliases/emailmessagedraft/) & `object`

Defined in: [email.ts:221](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L221)

Options for `sendEmail()`, combining a JSX draft with a delivery adapter.

## Type Declaration

### adapter

> **adapter**: [`EmailAdapter`](/api/core/index/type-aliases/emailadapter/)

## Example

```tsx
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
