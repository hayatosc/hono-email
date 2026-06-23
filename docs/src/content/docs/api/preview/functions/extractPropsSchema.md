---
editUrl: false
next: false
prev: false
title: 'extractPropsSchema'
---

> **extractPropsSchema**(`mod`): [`PropsSchema`](/api/preview/type-aliases/propsschema/)

Defined in: [props/index.ts:106](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/preview/src/props/index.ts#L106)

Extract a props schema from a template module's `previewProps` export.

If the module does not export `previewProps`, returns an empty schema
so the preview UI can fall back to JSON mode.

## Parameters

### mod

`Record`\<`string`, `unknown`\>

## Returns

[`PropsSchema`](/api/preview/type-aliases/propsschema/)
