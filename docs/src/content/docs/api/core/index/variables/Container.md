---
editUrl: false
next: false
prev: false
title: 'Container'
---

> `const` **Container**: `FC`\<`PropsWithChildren`\<`ElementProps`\<`"table"`\>\>\>

Defined in: [components/layout.tsx:448](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/layout.tsx#L448)

Full-width presentation table for wrapping email sections.

## Param

**props**

Standard `<table>` attributes and children.

## Returns

A full-width presentation table.

## Example

```tsx
<Container style={{ maxWidth: '560px', margin: '0 auto' }}>
  <Text>Hello</Text>
</Container>
```
