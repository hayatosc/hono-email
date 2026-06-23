---
editUrl: false
next: false
prev: false
title: 'MarkdownStyleMode'
---

> **MarkdownStyleMode** = `"inline"` \| `"tailwind"`

Defined in: [markdown/index.ts:85](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/markdown/index.ts#L85)

Controls whether Markdown defaults are applied as inline styles or Tailwind class names.

## Remarks

`tailwind` mode must be rendered inside `<Tailwind>`.

## Example

```tsx
<Tailwind>
  <Markdown markdownStyleMode="tailwind">{`# Welcome`}</Markdown>
</Tailwind>
```
