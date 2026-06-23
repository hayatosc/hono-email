---
editUrl: false
next: false
prev: false
title: 'Font'
---

> **Font**(`props`): `HtmlEscapedString`

Defined in: [components/feature.tsx:71](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/feature.tsx#L71)

Renders `@font-face` and fallback font-family CSS for use inside `<Head>`.

## Parameters

### props

[`FontProps`](/api/core/index/type-aliases/fontprops/)

Font declaration props.

## Returns

`HtmlEscapedString`

A `<style>` tag for the font declaration.

## Example

```tsx
<Head>
  <Font
    fallbackFontFamily={['Arial', 'sans-serif']}
    fontFamily="Inter"
    webFont={{ url: 'https://example.com/inter.woff2', format: 'woff2' }}
  />
</Head>
```
