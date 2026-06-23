---
editUrl: false
next: false
prev: false
title: 'buildTailwindArtifactFromCss'
---

> **buildTailwindArtifactFromCss**(`options`): [`TailwindBuildArtifact`](/api/core/index/type-aliases/tailwindbuildartifact/)

Defined in: [tailwind/index.ts:468](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/tailwind/index.ts#L468)

Builds a Tailwind artifact from CSS for explicit `<Tailwind artifact={...}>` usage.

## Parameters

### options

[`BuildTailwindArtifactFromCssOptions`](/api/core/index/type-aliases/buildtailwindartifactfromcssoptions/)

CSS and optional class list.

## Returns

[`TailwindBuildArtifact`](/api/core/index/type-aliases/tailwindbuildartifact/)

Tailwind build artifact consumed by `<Tailwind>`.

## Example

```ts
const artifact = buildTailwindArtifactFromCss({
  css: '.text-brand { color: #111827; }',
})
```
