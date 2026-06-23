---
editUrl: false
next: false
prev: false
title: 'EmailDkimOptions'
---

> **EmailDkimOptions** = `object`

Defined in: [email.ts:95](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L95)

DKIM signing options applied by adapters that support DKIM.

## Example

```ts
const dkim: EmailDkimOptions = {
  domainName: 'example.com',
  keySelector: 'mail',
  privateKey,
}
```

## Properties

### domainName

> **domainName**: `string`

Defined in: [email.ts:96](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L96)

Signing domain.

---

### headerFieldNames?

> `optional` **headerFieldNames?**: `string`[]

Defined in: [email.ts:99](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L99)

Header names to include in the signature.

---

### keySelector

> **keySelector**: `string`

Defined in: [email.ts:97](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L97)

DKIM selector.

---

### privateKey

> **privateKey**: `string`

Defined in: [email.ts:98](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L98)

PEM private key.

---

### skipFields?

> `optional` **skipFields?**: `string`[]

Defined in: [email.ts:100](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/email.ts#L100)

Header names to exclude from signing.
