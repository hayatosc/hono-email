---
editUrl: false
next: false
prev: false
title: 'render'
---

> **render**(`jsx`, `options?`): `Promise`\<[`RenderResult`](/api/core/index/type-aliases/renderresult/)\>

Defined in: [index.ts:268](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L268)

Renders a `hono/jsx` email tree into HTML and plain text.

## Parameters

### jsx

`Child`

Email JSX tree to render.

### options?

[`RenderOptions`](/api/core/index/type-aliases/renderoptions/) = `{}`

Render options.

## Returns

`Promise`\<[`RenderResult`](/api/core/index/type-aliases/renderresult/)\>

Rendered HTML and derived plain text.

## Example

```tsx
const { html, text } = await render(
  <Html>
    <Body>
      <Text>Hello from hono-email.</Text>
    </Body>
  </Html>,
)
```
