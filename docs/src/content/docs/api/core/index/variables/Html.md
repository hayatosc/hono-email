---
editUrl: false
next: false
prev: false
title: 'Html'
---

> `const` **Html**: `FC`\<`PropsWithChildren`\<`ElementProps`\<`"html"`\>\>\>

Defined in: [components/layout.tsx:143](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/layout.tsx#L143)

Root `<html>` element for an email document.

## Param

**props**

Standard `<html>` attributes and children.

## Returns

The root email document element.

## Example

```tsx
<Html lang="en">
  <Head />
  <Body>Hello</Body>
</Html>
```
