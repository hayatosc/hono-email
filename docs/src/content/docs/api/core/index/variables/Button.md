---
editUrl: false
next: false
prev: false
title: 'Button'
---

> `const` **Button**: `FC`\<`LinkProps`\>

Defined in: [components/content.tsx:285](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/components/content.tsx#L285)

Link rendered with button-friendly defaults and Outlook padding support.

## Param

**props**

Button link props.

## Param

**props.href**

Destination URL.

## Param

**props.target**

Link target. Defaults to `_blank`.

## Returns

An anchor styled as a button.

## Example

```tsx
<Button
  href="https://example.com/start"
  style={{ backgroundColor: '#111827', color: '#ffffff', padding: '12px 16px' }}
>
  Get started
</Button>
```
