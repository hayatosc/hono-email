---
editUrl: false
next: false
prev: false
title: 'Section'
---

> `const` **Section**: `FC`\<`PropsWithChildren`\<`ElementProps`\<`"table"`\>\>\>

Defined in: [components/layout.tsx:472](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/layout.tsx#L472)

Full-width presentation table whose direct children are table rows/cells.

## Param

**props**

Standard `<table>` attributes and children.

## Returns

A section table with one row.

## Example

```tsx
<Section>
  <Column width="50%">Left</Column>
  <Column width="50%">Right</Column>
</Section>
```
