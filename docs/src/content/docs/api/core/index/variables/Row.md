---
editUrl: false
next: false
prev: false
title: 'Row'
---

> `const` **Row**: `FC`\<`PropsWithChildren`\<`ElementProps`\<`"tr"`\>\>\>

Defined in: [components/layout.tsx:494](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/layout.tsx#L494)

Table row helper for manual email table layouts.

## Param

**props**

Standard `<tr>` attributes and children.

## Returns

A table row.

## Example

```tsx
<Row>
  <Column>Receipt total</Column>
  <Column>$42.00</Column>
</Row>
```
