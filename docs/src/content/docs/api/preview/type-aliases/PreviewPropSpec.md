---
editUrl: false
next: false
prev: false
title: 'PreviewPropSpec'
---

> **PreviewPropSpec** = `object`

Defined in: [props/index.ts:28](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/preview/src/props/index.ts#L28)

User-facing prop spec for a single prop in the `previewProps` export.

## Example

```tsx
import type { PreviewPropsConfig } from '@hono-email/preview'

export const previewProps = {
  name: { type: 'string', default: 'Guest' },
  showButton: { type: 'boolean', default: true },
  address: { type: 'string', multiline: true, default: 'Line 1\nLine 2' },
  tags: { type: 'array', default: ['Item A', 'Item B'] },
  items: {
    type: 'array',
    item: { name: { type: 'string' }, qty: { type: 'number' } },
    default: [{ name: 'Widget', qty: 1 }],
  },
} satisfies PreviewPropsConfig
```

- `multiline: true` renders a string prop as a textarea.
- `item` describes each element of an object array so the form can edit
  fields per item (add/remove). Arrays without `item` edit as a list of
  string values.

## Properties

### default?

> `optional` **default?**: `unknown`

Defined in: [props/index.ts:30](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/preview/src/props/index.ts#L30)

---

### item?

> `optional` **item?**: [`PreviewPropsConfig`](/api/preview/type-aliases/previewpropsconfig/)

Defined in: [props/index.ts:36](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/preview/src/props/index.ts#L36)

Field schema for each element of an object array.

---

### multiline?

> `optional` **multiline?**: `boolean`

Defined in: [props/index.ts:34](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/preview/src/props/index.ts#L34)

Render a string prop as a multi-line textarea.

---

### options?

> `optional` **options?**: `string`[]

Defined in: [props/index.ts:32](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/preview/src/props/index.ts#L32)

---

### required?

> `optional` **required?**: `boolean`

Defined in: [props/index.ts:31](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/preview/src/props/index.ts#L31)

---

### type?

> `optional` **type?**: `"string"` \| `"number"` \| `"boolean"` \| `"select"` \| `"array"`

Defined in: [props/index.ts:29](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/preview/src/props/index.ts#L29)
