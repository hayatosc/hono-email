---
editUrl: false
next: false
prev: false
title: 'MarkdownCustomStyles'
---

> **MarkdownCustomStyles** = `Partial`\<`Record`\<`MarkdownStyleKey`, `JSX.CSSProperties`\>\>

Defined in: [markdown/index.ts:51](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/markdown/index.ts#L51)

Inline style overrides for Markdown-generated elements.

## Example

```tsx
<Markdown markdownCustomStyles={{ h1: { color: '#111827' } }}>{`# Welcome`}</Markdown>
```
