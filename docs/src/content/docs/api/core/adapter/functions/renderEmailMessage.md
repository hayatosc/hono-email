---
editUrl: false
next: false
prev: false
title: 'renderEmailMessage'
---

> **renderEmailMessage**(`draft`): `Promise`\<[`EmailMessage`](/api/core/index/type-aliases/emailmessage/)\>

Defined in: [adapter/index.ts:44](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/index.ts#L44)

Renders a JSX draft into a transport-ready email message.

## Parameters

### draft

[`EmailMessageDraft`](/api/core/index/type-aliases/emailmessagedraft/)

Email draft containing JSX and message metadata.

## Returns

`Promise`\<[`EmailMessage`](/api/core/index/type-aliases/emailmessage/)\>

Fully rendered email message.

## Example

```tsx
const message = await renderEmailMessage({
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
