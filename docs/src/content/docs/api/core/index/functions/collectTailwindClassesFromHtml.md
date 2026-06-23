---
editUrl: false
next: false
prev: false
title: 'collectTailwindClassesFromHtml'
---

> **collectTailwindClassesFromHtml**(`html`): `Promise`\<`string`[]\>

Defined in: [tailwind/index.ts:438](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/tailwind/index.ts#L438)

Collects class tokens from an HTML string.

## Parameters

### html

`string`

HTML to scan.

## Returns

`Promise`\<`string`[]\>

Unique class tokens in document order.

## Example

```ts
const classes = await collectTailwindClassesFromHtml('<p class="text-brand px-4">Hello</p>')
```
