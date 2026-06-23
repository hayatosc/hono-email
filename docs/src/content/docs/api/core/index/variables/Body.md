---
editUrl: false
next: false
prev: false
title: 'Body'
---

> `const` **Body**: `FC`\<`PropsWithChildren`\<`ElementProps`\<`"body"`\>\>\>

Defined in: [components/layout.tsx:175](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/layout.tsx#L175)

Email document body.

## Param

**props**

Standard `<body>` attributes and children.

## Returns

The email document body.

## Example

```tsx
<Body style={{ backgroundColor: '#f6f9fc' }}>
  <Text>Hello</Text>
</Body>
```
