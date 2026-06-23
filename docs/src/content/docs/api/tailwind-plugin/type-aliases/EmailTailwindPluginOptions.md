---
editUrl: false
next: false
prev: false
title: 'EmailTailwindPluginOptions'
---

> **EmailTailwindPluginOptions** = `object`

Defined in: [types.ts:10](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/tailwind-plugin/src/types.ts#L10)

Options for the `@hono-email/tailwind-plugin` Tailwind integration.

## Properties

### configPath?

> `optional` **configPath?**: `string`

Defined in: [types.ts:11](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/tailwind-plugin/src/types.ts#L11)

Optional Tailwind config path to include in generated CSS.

---

### css?

> `optional` **css?**: `string`

Defined in: [types.ts:12](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/tailwind-plugin/src/types.ts#L12)

Additional CSS appended to the generated per-file Tailwind CSS module.

---

### packageNames?

> `optional` **packageNames?**: `string`[]

Defined in: [types.ts:13](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/tailwind-plugin/src/types.ts#L13)

Package names whose `Tailwind` imports should be transformed.

---

### runtimeModuleSpecifier?

> `optional` **runtimeModuleSpecifier?**: `string`

Defined in: [types.ts:14](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/tailwind-plugin/src/types.ts#L14)

Module specifier used when generated code imports runtime helpers.

---

### safelist?

> `optional` **safelist?**: `string`[]

Defined in: [types.ts:15](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/tailwind-plugin/src/types.ts#L15)

Tailwind classes to always include in the generated artifact.
