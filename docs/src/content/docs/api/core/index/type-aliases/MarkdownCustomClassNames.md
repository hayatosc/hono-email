---
editUrl: false
next: false
prev: false
title: 'MarkdownCustomClassNames'
---

> **MarkdownCustomClassNames** = `Partial`\<`Record`\<`MarkdownStyleKey`, `string`\>\>

Defined in: [markdown/index.ts:70](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/markdown/index.ts#L70)

Class name overrides for Markdown-generated elements.

## Example

```tsx
<Markdown markdownStyleMode="tailwind" markdownCustomClassNames={{ h1: 'text-2xl font-semibold' }}>
  {`# Welcome`}
</Markdown>
```
