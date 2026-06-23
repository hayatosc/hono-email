---
editUrl: false
next: false
prev: false
title: 'EmailAddress'
---

> **EmailAddress** = `string` \| \{ `address`: `string`; `name?`: `string`; \}

Defined in: [email.ts:16](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L16)

Email address accepted by transport adapters.

## Example

```ts
const from: EmailAddress = { address: 'sender@example.com', name: 'Sender' }
```
