---
editUrl: false
next: false
prev: false
title: 'Column'
---

> `const` **Column**: `FC`\<`PropsWithChildren`\<`ElementProps`\<`"td"`\>\>\>

Defined in: [components/layout.tsx:511](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/layout.tsx#L511)

Table cell helper for manual email table layouts.

## Param

**props**

Standard `<td>` attributes and children.

## Returns

A table cell.

## Example

```tsx
<Column style={{ padding: '12px' }}>
  <Text>Cell content</Text>
</Column>
```
