---
editUrl: false
next: false
prev: false
title: 'RenderResult'
---

> **RenderResult** = `object`

Defined in: [index.ts:155](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L155)

HTML email output and the plain-text version generated from it.

## Example

```tsx
const result: RenderResult = await render(<WelcomeEmail />)
console.log(result.html, result.text, result.warnings)
```

## Properties

### html

> **html**: `string`

Defined in: [index.ts:156](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L156)

Rendered HTML email, including the configured doctype.

---

### text

> **text**: `string`

Defined in: [index.ts:157](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L157)

Plain-text output derived from the rendered HTML.

---

### warnings

> **warnings**: `string`[]

Defined in: [index.ts:158](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L158)

Compatibility warnings collected during render.
