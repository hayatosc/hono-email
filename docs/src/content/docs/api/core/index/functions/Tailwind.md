---
editUrl: false
next: false
prev: false
title: 'Tailwind'
---

> **Tailwind**(`props`): `Promise`\<`HtmlEscapedString`\>

Defined in: [components/feature.tsx:89](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/feature.tsx#L89)

Applies a Tailwind build artifact to descendant class names.

## Parameters

### props

`TailwindProps`

Tailwind wrapper props.

## Returns

`Promise`\<`HtmlEscapedString`\>

HTML with Tailwind classes converted to inline/head styles.

## Example

```tsx
<Tailwind>
  <Body>
    <Text className="text-slate-900 px-4">Hello</Text>
  </Body>
</Tailwind>
```
