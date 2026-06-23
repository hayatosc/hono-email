---
editUrl: false
next: false
prev: false
title: 'SmtpSocket'
---

> **SmtpSocket** = `object`

Defined in: [adapter/smtp/types.ts:67](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L67)

Runtime-neutral SMTP socket shape used by connectors.

## Example

```ts
const socket: SmtpSocket = {
  readable,
  writable,
  close: () => connection.close(),
}
```

## Properties

### close?

> `optional` **close?**: () => `Promise`\<`void`\> \| `void`

Defined in: [adapter/smtp/types.ts:73](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L73)

Optional close hook.

#### Returns

`Promise`\<`void`\> \| `void`

---

### closed?

> `optional` **closed?**: `Promise`\<`void`\>

Defined in: [adapter/smtp/types.ts:71](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L71)

Optional promise that resolves when the socket is closed.

---

### opened?

> `optional` **opened?**: `Promise`\<`unknown`\>

Defined in: [adapter/smtp/types.ts:70](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L70)

Optional promise that resolves when the socket is open.

---

### readable

> **readable**: `ReadableStream`\<`Uint8Array`\>

Defined in: [adapter/smtp/types.ts:68](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L68)

Incoming bytes from the SMTP server.

---

### startTls?

> `optional` **startTls?**: () => `SmtpSocket` \| `Promise`\<`SmtpSocket`\>

Defined in: [adapter/smtp/types.ts:72](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L72)

Optional STARTTLS upgrade hook.

#### Returns

`SmtpSocket` \| `Promise`\<`SmtpSocket`\>

---

### writable

> **writable**: `WritableStream`\<`Uint8Array`\>

Defined in: [adapter/smtp/types.ts:69](https://github.com/hayatosc/hono-email/blob/db96f3c79ef1d5fa68d6b1bcf36e88de1764034f/packages/core/src/adapter/smtp/types.ts#L69)

Outgoing bytes to the SMTP server.
