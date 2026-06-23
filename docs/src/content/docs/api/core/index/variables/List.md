---
editUrl: false
next: false
prev: false
title: 'List'
---

> `const` **List**: `FC`\<`ListProps`\>

Defined in: [components/content.tsx:446](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/content.tsx#L446)

Ordered or unordered list with email-oriented spacing defaults.

## Param

**props**

List props.

## Param

**props.marker**

CSS list marker style.

## Param

**props.ordered**

Render an ordered list when `true`; otherwise renders an unordered list.

## Returns

An ordered or unordered list.

## Example

```tsx
<List ordered>
  <ListItem>Confirm your address</ListItem>
  <ListItem>Open the dashboard</ListItem>
</List>
```
