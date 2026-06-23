---
editUrl: false
next: false
prev: false
title: 'Conditional'
---

> **Conditional**(`props`): `Promise`\<`HtmlEscapedString`\>

Defined in: [components/feature.tsx:158](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/feature.tsx#L158)

Renders Outlook conditional comment branches.

## Parameters

### props

`ConditionalProps`

Conditional rendering props.

## Returns

`Promise`\<`HtmlEscapedString`\>

Conditional-comment wrapped HTML.

## Example

```tsx
<Conditional mso>
  <Text>This appears in Outlook for Windows.</Text>
</Conditional>
```
