---
editUrl: false
next: false
prev: false
title: 'Preview'
---

> `const` **Preview**: `FC`\<`PropsWithChildren`\<`ElementProps`\<`"div"`\>\>\>

Defined in: [components/content.tsx:501](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/content.tsx#L501)

Hidden preview text that is relocated near the top of the rendered email.

## Param

**props**

Preview props and preview text children.

## Returns

A hidden preview text container.

## Example

```tsx
<Html>
  <Preview>Your receipt is ready.</Preview>
  <Body>...</Body>
</Html>
```
