---
editUrl: false
next: false
prev: false
title: 'WarningHandler'
---

> **WarningHandler** = `"warn"` \| `"error"` \| `"silent"` \| ((`warning`) => `void`)

Defined in: [index.ts:124](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/index.ts#L124)

Controls how compatibility warnings raised during render are handled.

- `'warn'`: log each warning with `console.warn` (default)
- `'error'`: throw an aggregated error when any warning is collected
- `'silent'`: collect warnings without logging
- `(warning) => void`: receive each warning (collect, route, or throw)
