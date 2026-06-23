---
editUrl: false
next: false
prev: false
title: 'Box'
---

> **Box**\<`As`\>(`props`): `Element`

Defined in: [components/layout.tsx:191](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/layout.tsx#L191)

Generic email-safe wrapper that can render as a limited set of common elements.

## Type Parameters

### As

`As` _extends_ `BoxElement` = `"div"`

## Parameters

### props

`BoxProps`\<`As`\>

Wrapper props.

## Returns

`Element`

The selected wrapper element.

## Example

```tsx
<Box as="td" style={{ padding: '16px' }}>
  <Text>Content</Text>
</Box>
```
