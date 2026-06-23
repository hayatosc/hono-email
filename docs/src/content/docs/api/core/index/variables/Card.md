---
editUrl: false
next: false
prev: false
title: 'Card'
---

> `const` **Card**: `FC`\<`CardProps`\>

Defined in: [components/layout.tsx:396](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/layout.tsx#L396)

Bordered table container with email-safe padding and background defaults.

## Param

**props**

Card props.

## Param

**props.backgroundColor**

Cell background color.

## Param

**props.borderColor**

Border color.

## Param

**props.borderWidth**

Border width. Numbers are converted to pixels.

## Param

**props.contentStyle**

Inline style applied to the inner content cell.

## Param

**props.padding**

Cell padding. Numbers are converted to pixels.

## Param

**props.width**

Table width.

## Returns

A one-cell presentation table.

## Example

```tsx
<Card padding={24} borderColor="#e5e7eb">
  <Text>Plan updated.</Text>
</Card>
```
