---
editUrl: false
next: false
prev: false
title: 'Grid'
---

> `const` **Grid**: `FC`\<`GridProps`\>

Defined in: [components/layout.tsx:318](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/layout.tsx#L318)

Table-based grid layout with a fixed number of columns.

## Param

**props**

Grid layout props.

## Param

**props.align**

Vertical alignment for child cells. Defaults to `top`.

## Param

**props.columns**

Number of columns per row. Defaults to `2`.

## Param

**props.gap**

Space between grid cells. Numbers are converted to pixels.

## Returns

A full-width presentation table grid.

## Example

```tsx
<Grid columns={2} gap={16}>
  <Card>
    <Text>One</Text>
  </Card>
  <Card>
    <Text>Two</Text>
  </Card>
</Grid>
```
