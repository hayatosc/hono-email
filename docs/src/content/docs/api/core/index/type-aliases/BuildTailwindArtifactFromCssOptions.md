---
editUrl: false
next: false
prev: false
title: 'BuildTailwindArtifactFromCssOptions'
---

> **BuildTailwindArtifactFromCssOptions** = `object`

Defined in: [tailwind/index.ts:51](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/tailwind/index.ts#L51)

CSS input used to build a Tailwind artifact.

## Example

```ts
buildTailwindArtifactFromCss({
  css: '.px-4 { padding-left: 1rem; padding-right: 1rem; }',
})
```

## Properties

### classes?

> `optional` **classes?**: `string`[]

Defined in: [tailwind/index.ts:53](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/tailwind/index.ts#L53)

Optional explicit class list. When omitted, classes are discovered from CSS.

---

### css

> **css**: `string`

Defined in: [tailwind/index.ts:52](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/tailwind/index.ts#L52)

CSS text to parse.
