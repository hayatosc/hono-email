---
editUrl: false
next: false
prev: false
title: 'ColorScheme'
---

> **ColorScheme**(`props`): `Element`

Defined in: [components/feature.tsx:187](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/feature.tsx#L187)

Declares supported light and dark color schemes for email clients.

## Parameters

### props

`ColorSchemeProps`

Color scheme props.

## Returns

`Element`

Meta and style tags for color-scheme support.

## Example

```tsx
<Head>
  <ColorScheme colorScheme="light dark" />
</Head>
```
