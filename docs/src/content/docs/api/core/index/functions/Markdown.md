---
editUrl: false
next: false
prev: false
title: 'Markdown'
---

> **Markdown**(`props`): `Promise`\<`HtmlEscapedString`\>

Defined in: [components/feature.tsx:123](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/feature.tsx#L123)

Converts Markdown into sanitized email-friendly HTML.

## Parameters

### props

`MarkdownProps`

Markdown render options and Markdown string children.

## Returns

`Promise`\<`HtmlEscapedString`\>

Rendered Markdown HTML.

## Example

```tsx
<Markdown markdownCustomStyles={{ h1: { color: '#111827' } }}>{`
# Welcome

Thanks for joining.
`}</Markdown>
```
