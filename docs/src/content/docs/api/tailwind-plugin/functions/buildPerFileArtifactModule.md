---
editUrl: false
next: false
prev: false
title: 'buildPerFileArtifactModule'
---

> **buildPerFileArtifactModule**(`encodedPath`, `runtimeModuleSpecifier?`): `string`

Defined in: [index.ts:159](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/tailwind-plugin/src/index.ts#L159)

Builds the per-file artifact virtual module content.

## Parameters

### encodedPath

`string`

URL-encoded file path.

### runtimeModuleSpecifier?

`string` = `...`

Module specifier for the runtime import.

## Returns

`string`

Artifact module string.

## Example

```ts
import { buildPerFileArtifactModule } from '@hono-email/tailwind-plugin'

const mod = buildPerFileArtifactModule(encodedPath, 'hono-email')
```
