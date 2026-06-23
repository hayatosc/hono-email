---
editUrl: false
next: false
prev: false
title: 'transformTailwindComponentSource'
---

> **transformTailwindComponentSource**(`code`, `id`, `packageNames?`): `string` \| `null`

Defined in: [index.ts:77](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/tailwind-plugin/src/index.ts#L77)

Transforms JSX source code by injecting Tailwind artifact imports into `<Tailwind>` components.

## Parameters

### code

`string`

Source code to transform.

### id

`string`

File path of the source module.

### packageNames?

`string`[] = `...`

Package names whose `Tailwind` imports should be recognized.

## Returns

`string` \| `null`

Transformed code string, or `null` if no transformation was needed.

## Example

```ts
import { transformTailwindComponentSource } from '@hono-email/tailwind-plugin'

const result = transformTailwindComponentSource(code, id)
```
