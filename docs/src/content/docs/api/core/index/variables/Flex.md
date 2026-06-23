---
editUrl: false
next: false
prev: false
title: 'Flex'
---

> `const` **Flex**: `FC`\<`FlexProps`\>

Defined in: [components/layout.tsx:245](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/layout.tsx#L245)

Table-based flex-like layout for email clients.

## Param

**props**

Flex layout props.

## Param

**props.align**

Vertical alignment for child cells. Defaults to `top`.

## Param

**props.direction**

Row or column layout. Defaults to `row`.

## Param

**props.gap**

Space between children. Numbers are converted to pixels.

## Param

**props.justify**

Horizontal table alignment or `space-between`.

## Returns

A presentation table that lays out its children.

## Example

```tsx
<Flex align="middle" gap={12} justify="center">
  <Text>Left</Text>
  <Text>Right</Text>
</Flex>
```
