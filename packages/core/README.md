# hono-email

[![npm version](https://img.shields.io/npm/v/hono-email)](https://www.npmjs.com/package/hono-email)
[![License](https://img.shields.io/npm/l/hono-email)](LICENSE)

`hono-email` is a lightweight, type-safe email template engine for Hono, powered by Hono JSX. It focuses on rendering, normalization, validation, and email-oriented primitives.

Full documentation is available at [hono-email.hayatosc.dev](https://hono-email.hayatosc.dev).

## Features

- **Hono JSX support**: Use `hono/jsx` components to structure emails.
- **HTML & Plain Text**: Renders both responsive HTML email and plain text simultaneously.
- **Strict Validation**: Checked against risky CSS properties and unsupported tags by default.
- **Styling**: Write inline styles, use `hono/css` (CSS-in-JS), or integrate with Tailwind CSS.
- **Transports**: Send emails via built-in adapters (SMTP, Resend, SendGrid, Postmark, Mailgun, Cloudflare Email).

## Setup

```sh
npm i hono-email
```

## Quick Start

Create your email template:

```tsx
import { Body, Button, Container, Head, Heading, Html, Preview, Text, render } from 'hono-email'

function WelcomeEmail() {
  return (
    <Html lang="en">
      <Head>
        <title>Welcome</title>
      </Head>
      <Preview>Your account is ready.</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', color: '#1f2937' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '24px' }}>
          <Heading as="h1">Welcome</Heading>
          <Text>Thanks for signing up.</Text>
          <Button href="https://example.com/start">Get started</Button>
        </Container>
      </Body>
    </Html>
  )
}

const { html, text } = await render(<WelcomeEmail />)
```

## Nested Tailwind

`<Tailwind>` wrappers can be nested with the same or different build artifacts.
Each element is handled by its nearest wrapper. Outer wrappers skip HTML already
processed by an inner wrapper, including renamed variant classes, inline styles,
head CSS, and dropped-class warnings. Classes needed by head CSS and unrelated
classes such as `hono/css` tokens remain in the output; explicit inline styles
keep their precedence.

```tsx
<Tailwind artifact={pageArtifact}>
  <Body>
    <Text className="text-page">Page content</Text>
    <Tailwind artifact={cardArtifact}>
      <Text className="text-card hover:text-accent">Card content</Text>
    </Tailwind>
  </Body>
</Tailwind>
```

Each artifact must include the classes used in its own scope. A missing class
still rejects rendering, even if another wrapper's artifact includes it.
Responsive and pseudo-class CSS from every wrapper is moved into the document
head, and all dropped-class warnings reach `render()`'s warning handler.

## Delivery errors

Built-in adapters return a receipt with `successful: false` when message validation
or delivery fails. Check `receipt.errorMessages`; `receipt.cause` retains the original
error when available. `sendEmail()` rejects if rendering fails before delivery, and
sending through an explicitly closed SMTP transport also rejects. Custom adapters
may reject their own operations, so handle promise rejection as well as the receipt.

Import `SmtpTransportClosedError` from `hono-email/smtp` and use
`error instanceof SmtpTransportClosedError` to identify closed-transport lifecycle
rejections from `send()` or `verify()`. Its `name` is `SmtpTransportClosedError`;
ordinary delivery failures remain failed receipts.

## SMTP DKIM

Configure `SmtpTransportOptions.dkim` when all sends should use the same signing settings. For per-send signing, use the optional `SmtpSendOptions` argument to `SmtpTransport.send()`, exported from `hono-email/smtp`. Load `privateKey` from your application's secret store.

```tsx
import { Body, Html, Text } from 'hono-email'
import { renderEmailMessage } from 'hono-email/adapter'
import { SmtpTransport, type SmtpSendOptions } from 'hono-email/smtp'
import { nodeSmtpConnector } from 'hono-email/smtp/node'

const smtp = new SmtpTransport({
  connector: nodeSmtpConnector,
  hostname: 'smtp.example.com',
  port: 587,
  secure: 'starttls',
})
const message = await renderEmailMessage({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Welcome',
  jsx: (
    <Html>
      <Body>
        <Text>Hello</Text>
      </Body>
    </Html>
  ),
})
const options: SmtpSendOptions = {
  dkim: { domainName: 'example.com', keySelector: 'mail', privateKey },
}
await smtp.send(message, options)
await smtp.close()
```

DKIM settings are selected in this order, without merging configurations:

1. `smtp.send(message, { dkim })` for the current send.
2. Legacy `message.dkim`.
3. The transport's `dkim` default.

Omitting per-send `dkim` inherits the legacy or transport setting. `false` is not supported as a DKIM value; signing is disabled only when no DKIM configuration is present. Per-send options do not mutate the message or change defaults for later sends. `SmtpTransport` remains compatible with `EmailAdapter` and `sendEmail()`.

`EmailMessage.dkim` is deprecated, but it has not been removed and remains supported in `EmailMessageDraft` and `sendEmail()` options. Migrate `smtp.send({ ...message, dkim })` to `smtp.send(message, { dkim })`. For JSX drafts passed to `sendEmail({ adapter: smtp, ..., dkim })`, either move shared signing settings into the transport constructor or render with `renderEmailMessage()` and pass per-send settings to `smtp.send()` as shown above. The shared `sendEmail()` helper does not accept SMTP-specific send options.

HTTP provider adapters (Resend, SendGrid, Postmark, Mailgun, and Cloudflare Email Service REST) cannot apply locally supplied DKIM settings and do not forward `message.dkim` in their payloads. Configure DKIM with the provider; signing is provider-side. The Cloudflare Email Service Workers adapter also does not apply local DKIM settings. This differs from `SmtpTransport` used with the Cloudflare SMTP connector, which signs locally.

## Documentation

For advanced usages such as transport adapters, Markdown, `hono/css`, Tailwind CSS, and CLI tools, please check the [Documentation Site](https://hono-email.hayatosc.dev).
