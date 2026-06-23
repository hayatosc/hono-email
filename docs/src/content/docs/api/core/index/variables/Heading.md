---
editUrl: false
next: false
prev: false
title: 'Heading'
---

> `const` **Heading**: `FC`\<`HeadingProps`\>

Defined in: [components/content.tsx:240](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/content.tsx#L240)

Heading element with optional semantic level and margin shorthands.

## Param

**props**

Heading props.

## Param

**props.as**

Heading tag to render. Defaults to `h1`.

## Param

**props.m**

Margin shorthand.

## Param

**props.mx**

Horizontal margin shorthand.

## Param

**props.my**

Vertical margin shorthand.

## Param

**props.mt**

Top margin.

## Param

**props.mr**

Right margin.

## Param

**props.mb**

Bottom margin.

## Param

**props.ml**

Left margin.

## Returns

A heading element.

## Example

```tsx
<Heading as="h2" mb={12}>
  Account summary
</Heading>
```
