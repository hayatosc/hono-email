---
editUrl: false
next: false
prev: false
title: 'unpluginFactory'
---

> `const` **unpluginFactory**: `UnpluginFactory`\<[`EmailTailwindPluginOptions`](/api/tailwind-plugin/type-aliases/emailtailwindpluginoptions/) \| `undefined`\>

Defined in: [index.ts:180](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/tailwind-plugin/src/index.ts#L180)

Raw unplugin factory for custom plugin wiring.

## Param

**options**

Tailwind plugin options.

## Returns

An unplugin definition.

## Example

```ts
import { unpluginFactory } from '@hono-email/tailwind-plugin'

const plugin = unpluginFactory({ safelist: ['text-brand'] })
```
