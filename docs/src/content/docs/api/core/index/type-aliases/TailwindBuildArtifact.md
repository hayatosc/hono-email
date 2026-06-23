---
editUrl: false
next: false
prev: false
title: 'TailwindBuildArtifact'
---

> **TailwindBuildArtifact** = `object`

Defined in: [tailwind/index.ts:30](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/tailwind/index.ts#L30)

Compiled Tailwind CSS data consumed by `<Tailwind>`.

## Example

```ts
const artifact: TailwindBuildArtifact = buildTailwindArtifactFromCss({
  css: '.text-brand { color: #111827; }',
})
```

## Properties

### classes

> **classes**: `string`[]

Defined in: [tailwind/index.ts:31](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/tailwind/index.ts#L31)

Class tokens known to the artifact.

---

### droppedClasses

> **droppedClasses**: `string`[]

Defined in: [tailwind/index.ts:35](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/tailwind/index.ts#L35)

Class tokens dropped because their selector is unsupported (combinator/pseudo-element).

---

### headCssByClass

> **headCssByClass**: `Record`\<`string`, `string`\>

Defined in: [tailwind/index.ts:32](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/tailwind/index.ts#L32)

Responsive, pseudo, or head-only CSS keyed by class token.

---

### inlineStylesByClass

> **inlineStylesByClass**: `Record`\<`string`, `Record`\<`string`, `string`\>\>

Defined in: [tailwind/index.ts:33](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/tailwind/index.ts#L33)

Inline declarations keyed by class token.

---

### renamedClasses

> **renamedClasses**: `Record`\<`string`, `string`\>

Defined in: [tailwind/index.ts:34](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/tailwind/index.ts#L34)

Email-safe class tokens keyed by original token, for pseudo-class variants.
