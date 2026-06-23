---
editUrl: false
next: false
prev: false
title: 'RenderOptions'
---

> **RenderOptions** = [`BaseRenderOptions`](/api/core/index/type-aliases/baserenderoptions/) & `object`

Defined in: [index.ts:138](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L138)

Options for rendering JSX into HTML and derived plain text.

## Type Declaration

### text?

> `optional` **text?**: `PlainTextRenderOptions`

## Example

```tsx
await render(<WelcomeEmail />, {
  text: { linkFormat: 'text-only' },
})
```
