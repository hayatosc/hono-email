---
editUrl: false
next: false
prev: false
title: 'BaseRenderOptions'
---

> **BaseRenderOptions** = `object`

Defined in: [index.ts:107](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L107)

Shared HTML render options.

## Example

```tsx
const options: BaseRenderOptions = {
  doctype: 'xhtml-transitional',
  pretty: true,
}
```

## Properties

### doctype?

> `optional` **doctype?**: `"html5"` \| `"xhtml-transitional"` \| `false`

Defined in: [index.ts:108](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L108)

Doctype to prepend. Defaults to HTML5.

---

### minify?

> `optional` **minify?**: `boolean`

Defined in: [index.ts:110](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L110)

Minify the rendered HTML. Defaults to `true`. Ignored when `pretty` is `true`.

---

### onWarning?

> `optional` **onWarning?**: [`WarningHandler`](/api/core/index/type-aliases/warninghandler/)

Defined in: [index.ts:113](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L113)

How compatibility warnings are handled. `'warn'` (default) logs to `console.warn`,
`'error'` throws when any warning is collected, `'silent'` suppresses logging, or pass a callback to
receive each warning. Warnings are always available on `RenderResult.warnings`.

---

### pretty?

> `optional` **pretty?**: `boolean`

Defined in: [index.ts:109](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L109)

Pretty-print the rendered HTML when `true`. Takes precedence over `minify`.

---

### strict?

> `optional` **strict?**: `boolean`

Defined in: [index.ts:112](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L112)

Run strict email validation when `true`. Defaults to `true`.

---

### widows?

> `optional` **widows?**: `boolean`

Defined in: [index.ts:111](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L111)

Join the last two words of each text node with `&nbsp;` when `true`.
