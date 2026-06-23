---
editUrl: false
next: false
prev: false
title: 'EmailMessageDraft'
---

> **EmailMessageDraft** = `Omit`\<[`EmailMessage`](/api/core/index/type-aliases/emailmessage/), `"html"` \| `"text"`\> & `object`

Defined in: [email.ts:159](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L159)

Email message draft that stores JSX before rendering.

## Type Declaration

### jsx

> **jsx**: `Child`

### render?

> `optional` **render?**: [`RenderOptions`](/api/core/index/type-aliases/renderoptions/)

## Example

```tsx
const draft: EmailMessageDraft = {
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
}
```
