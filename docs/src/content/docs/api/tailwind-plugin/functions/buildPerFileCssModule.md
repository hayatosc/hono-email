---
editUrl: false
next: false
prev: false
title: 'buildPerFileCssModule'
---

> **buildPerFileCssModule**(`sourceFilePath`, `options?`): `string`

Defined in: [index.ts:121](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/tailwind-plugin/src/index.ts#L121)

Builds the per-file CSS virtual module content for Tailwind processing.

## Parameters

### sourceFilePath

`string`

Absolute path of the email source file.

### options?

[`EmailTailwindPluginOptions`](/api/tailwind-plugin/type-aliases/emailtailwindpluginoptions/) = `{}`

Plugin options.

## Returns

`string`

CSS module string.

## Example

```ts
import { buildPerFileCssModule } from '@hono-email/tailwind-plugin'

const css = buildPerFileCssModule('/abs/emails/welcome.tsx', { safelist: ['text-brand'] })
```
