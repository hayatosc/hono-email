---
editUrl: false
next: false
prev: false
title: 'FontProps'
---

> **FontProps** = `object`

Defined in: [font/index.ts:26](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/font/index.ts#L26)

Options for rendering a web font declaration and fallback font family.

## Example

```tsx
<Font
  fallbackFontFamily={['Arial', 'sans-serif']}
  fontFamily="Inter"
  fontWeight={400}
  webFont={{ url: 'https://example.com/inter.woff2', format: 'woff2' }}
/>
```

## Properties

### fallbackFontFamily

> **fallbackFontFamily**: `string` \| `string`[]

Defined in: [font/index.ts:27](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/font/index.ts#L27)

Fallback family or families appended after `fontFamily`.

---

### fontFamily

> **fontFamily**: `string`

Defined in: [font/index.ts:28](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/font/index.ts#L28)

Primary font-family name.

---

### fontStyle?

> `optional` **fontStyle?**: `FontStyle`

Defined in: [font/index.ts:29](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/font/index.ts#L29)

Optional CSS font style.

---

### fontWeight?

> `optional` **fontWeight?**: `FontWeight`

Defined in: [font/index.ts:30](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/font/index.ts#L30)

Optional CSS font weight.

---

### webFont?

> `optional` **webFont?**: `object`

Defined in: [font/index.ts:31](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/font/index.ts#L31)

Optional remote web font source.

#### format

> **format**: `FontFormat`

#### url

> **url**: `string`
