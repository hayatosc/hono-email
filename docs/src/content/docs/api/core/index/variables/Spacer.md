---
editUrl: false
next: false
prev: false
title: 'Spacer'
---

> `const` **Spacer**: `FC`\<`SpacerProps`\>

Defined in: [components/layout.tsx:211](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/layout.tsx#L211)

Explicit spacing block for email clients.

## Param

**props**

Spacer props.

## Param

**props.height**

Spacer height. Numbers are converted to pixels.

## Param

**props.width**

Spacer width. Numbers are converted to pixels.

## Returns

A hidden spacing `<div>`.

## Example

```tsx
<Text>First paragraph</Text>
<Spacer height={24} />
<Text>Second paragraph</Text>
```
