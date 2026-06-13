# hono-email

[![npm version](https://img.shields.io/npm/v/hono-email)](https://www.npmjs.com/package/hono-email)
[![License](https://img.shields.io/npm/l/hono-email)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

`hono-email` is an ESM library for rendering HTML email and plain text from `hono/jsx`. It focuses on rendering, normalization, validation, and email-oriented primitives.

> [!WARNING]
> This project is in the early stages of development. APIs and other elements are subject to change in the future.

## Features

- Render HTML email from `hono/jsx`
- Render plain text from the same JSX tree through `render()`
- Keep strict email validation enabled by default
- Minify output by default, with optional pretty printing and widow control
- Style markdown content with the `Markdown` component
- Use `hono/css` class-based CSS-in-JS as a styling option
- Apply Tailwind utility output through `Tailwind` build artifacts
- Send rendered email through transport adapters (SMTP, Resend, SendGrid, Postmark, Mailgun, Cloudflare Email)
- Expose bundler integrations through `@hono-email/tailwind-plugin`

## Setup

```sh
npm i hono-email
```

## Quick Start

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

const { html, text } = await render(<WelcomeEmail />, {
  text: {
    headingStyle: 'preserve',
    linkFormat: 'text-only',
  },
})
```

## `render()`

`render()` is the primary runtime API.

- Returns HTML, plain text, and collected warnings as `{ html, text, warnings }`
- Uses `strict: true` by default
- Accepts `doctype: 'html5' | 'xhtml-transitional' | false`
- Minifies the HTML by default. Set `pretty: true` for readable output, or `minify: false` for unprocessed HTML. `pretty` takes precedence over `minify`.
- Set `widows: true` to join the last two words of each text block with a non-breaking space
- Always expands three-digit hex colors (`#abc` → `#aabbcc`) inside `style` attributes and `<style>` blocks
- Controls warning handling through `onWarning: 'warn' | 'error' | 'silent' | (warning) => void` (default `'warn'`)
- Accepts plain-text options through the `text` field

```tsx
const { html, text } = await render(<WelcomeEmail />, {
  text: {
    linkFormat: 'text-only',
    listBullet: '*',
  },
})
```

## Send Email with Adapter

### SMTP

`hono-email/smtp` provides a connector-based SMTP sender.

```tsx
import CloudflareConnector from 'hono-email/smtp/cloudflare'
import { Body, Html, Text, sendEmail } from 'hono-email'
import { SmtpTransport } from 'hono-email/smtp'

const dkimPrivateKey = `-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----`

const smtp = new SmtpTransport({
  connector: CloudflareConnector,
  hostname: 'smtp.example.com',
  port: 587,
  secure: 'starttls',
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 30_000,
  auth: {
    username: 'smtp-user',
    password: 'smtp-password',
  },
  dkim: {
    domainName: 'example.com',
    keySelector: 'mail',
    privateKey: dkimPrivateKey,
  },
  pool: {
    maxConnections: 2,
    maxMessages: 100,
  },
  limits: {
    maxAttachmentSize: 10 * 1024 * 1024,
  },
})

try {
  await smtp.verify()

  const receipt = await sendEmail({
    adapter: smtp,
    from: 'sender@example.com',
    to: ['recipient@example.com', 'second@example.com'],
    subject: 'Welcome',
    envelope: {
      from: 'bounces@example.com',
    },
    jsx: (
      <Html>
        <Body>
          <Text>Hello from hono-email.</Text>
        </Body>
      </Html>
    ),
    attachments: [
      {
        filename: 'invoice.txt',
        content: 'Invoice text',
        contentType: 'text/plain',
      },
      {
        filename: 'logo.png',
        href: 'https://example.com/assets/logo.png',
        cid: 'logo',
        contentDisposition: 'inline',
      },
    ],
  })

  if (!receipt.successful) {
    console.error(receipt.errorMessages)
  }
} finally {
  await smtp.close()
}
```

SMTP transport uses Web Streams internally. Runtime-specific socket support is supplied by a
connector such as `hono-email/smtp/cloudflare`, which uses Cloudflare Workers
`cloudflare:sockets`. Cloudflare Workers does not allow outbound SMTP connections on port `25`, so
use submission ports such as `465` or `587`.

`SmtpTransport` reuses SMTP sessions until `transport.close()` is called. The default pool size is
`1`, so sends on the same transport share one TCP connection sequentially. Set
`pool.maxConnections` to allow multiple concurrent SMTP sessions, and `pool.maxMessages` to retire a
session after a fixed number of messages. If a session fails during send, that session is discarded
and the message is not retried automatically.

SMTP-specific delivery controls:

- `await transport.verify()` checks connection setup, TLS negotiation, and authentication without sending a message.
- `dkim` can be configured on `SmtpTransport` or overridden per message to add a `DKIM-Signature` header before SMTP delivery.
- `envelope` lets you override the SMTP envelope sender and recipients without changing the visible `From` / `To` headers.
- `to`, `cc`, `bcc`, and `envelope.to` accept single addresses or arrays. SMTP sends one `RCPT TO` command per resolved recipient and reports partial recipient rejection in `receipt.rejected`.
- `attachments` supports `content`, `href`, remote URL / data URI `path`, `ReadableStream`, `encoding`, inline `cid`, and explicit `contentType`. `hono-email` does not read local files; read local files in your app and pass the bytes as `content`. `limits.maxAttachmentSize` rejects oversized attachments before delivery.
- `headers` is for custom headers only. Managed headers such as `From`, `To`, `Subject`, `Date`, `Message-ID`, `MIME-Version`, and `Content-Type` are rejected when passed as custom headers.
- `connectionTimeout`, `greetingTimeout`, and `socketTimeout` bound SMTP connection and protocol waits. STARTTLS and AUTH are checked against EHLO capabilities before use.

Runtime connector entry points:

- `hono-email/smtp/cloudflare` for Cloudflare Workers
- `hono-email/smtp/node` for Node.js
- `hono-email/smtp/deno` for Deno
- `hono-email/smtp/bun` for Bun

Bun's TCP API supports direct TLS connections, but this connector does not support STARTTLS upgrade.
Use port `465` with `secure: true` on Bun.

### Resend

`hono-email/resend` provides `ResendAdapter` for the Resend Email API.

```tsx
import { Body, Html, Text, sendEmail } from 'hono-email'
import ResendAdapter from 'hono-email/resend'

const receipt = await sendEmail({
  adapter: ResendAdapter({
    apiKey: process.env.RESEND_API_KEY!,
  }),
  from: 'Sender <sender@example.com>',
  to: ['recipient@example.com'],
  subject: 'Welcome',
  jsx: (
    <Html>
      <Body>
        <Text>Hello from Resend.</Text>
      </Body>
    </Html>
  ),
  attachments: [
    {
      filename: 'invoice.txt',
      content: 'Invoice text',
      contentType: 'text/plain',
    },
  ],
})

if (!receipt.successful) {
  console.error(receipt.errorMessages)
}
```

The adapter calls Resend directly with `fetch`; the official Resend SDK is not required. Resend
requires a `User-Agent` header for direct HTTP requests, so `ResendAdapter` sends one by default and
also accepts a `userAgent` override.

### SendGrid

`hono-email/sendgrid` provides `SendGridAdapter` for the Twilio SendGrid Mail Send API.

```tsx
import { Body, Html, Text, sendEmail } from 'hono-email'
import { SendGridAdapter } from 'hono-email/sendgrid'

const receipt = await sendEmail({
  adapter: SendGridAdapter({
    apiKey: process.env.SENDGRID_API_KEY!,
  }),
  from: { address: 'sender@example.com', name: 'Sender' },
  to: ['recipient@example.com'],
  subject: 'Welcome',
  jsx: (
    <Html>
      <Body>
        <Text>Hello from SendGrid.</Text>
      </Body>
    </Html>
  ),
})
```

The adapter sends JSON directly to `/v3/mail/send` and maps SendGrid error responses to
`SendEmailReceipt`. Use `apiBaseUrl: 'https://api.eu.sendgrid.com'` for SendGrid EU regional
sending.

### Postmark

`hono-email/postmark` provides `PostmarkAdapter` for the Postmark Email API.

```tsx
import { Body, Html, Text, sendEmail } from 'hono-email'
import { PostmarkAdapter } from 'hono-email/postmark'

const receipt = await sendEmail({
  adapter: PostmarkAdapter({
    serverToken: process.env.POSTMARK_SERVER_TOKEN!,
    messageStream: 'outbound',
  }),
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Welcome',
  jsx: (
    <Html>
      <Body>
        <Text>Hello from Postmark.</Text>
      </Body>
    </Html>
  ),
})
```

Optional Postmark delivery controls include `messageStream`, `tag`, `trackOpens`, and `trackLinks`.

### Mailgun

`hono-email/mailgun` provides `MailgunAdapter` for the Mailgun Messages API.

```tsx
import { Body, Html, Text, sendEmail } from 'hono-email'
import { MailgunAdapter } from 'hono-email/mailgun'

const receipt = await sendEmail({
  adapter: MailgunAdapter({
    apiKey: process.env.MAILGUN_API_KEY!,
    domain: process.env.MAILGUN_DOMAIN!,
  }),
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Welcome',
  jsx: (
    <Html>
      <Body>
        <Text>Hello from Mailgun.</Text>
      </Body>
    </Html>
  ),
})
```

The adapter sends a `multipart/form-data` request to `/v3/{domain}/messages`. Use
`apiBaseUrl: 'https://api.eu.mailgun.net'` for Mailgun EU domains.

All provider adapters support `to`, `cc`, `bcc`, `replyTo`, custom `headers`, and `attachments`.
Inline attachments use `cid` when the provider supports content IDs. They call provider APIs with
`fetch`, so official provider SDKs are not required.

### Cloudflare Email Service

`hono-email/cloudflare` provides `CloudflareEmailAdapter` and connectors for Cloudflare Email Service.

On Cloudflare Workers (using `WorkersConnector`):

```tsx
import { Body, Html, Text, sendEmail } from 'hono-email'
import { CloudflareEmailAdapter } from 'hono-email/cloudflare'
import WorkersConnector from 'hono-email/cloudflare/workers'

export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    const receipt = await sendEmail({
      adapter: CloudflareEmailAdapter({ connector: WorkersConnector }),
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Welcome',
      jsx: (
        <Html>
          <Body>
            <Text>Hello from Cloudflare Workers.</Text>
          </Body>
        </Html>
      ),
    })

    return Response.json(receipt)
  },
}
```

REST API (other runtimes, using `RESTConnector`):

```tsx
import { Body, Html, Text, sendEmail } from 'hono-email'
import { CloudflareEmailAdapter, RESTConnector } from 'hono-email/cloudflare'

const receipt = await sendEmail({
  adapter: CloudflareEmailAdapter({
    connector: RESTConnector({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      apiToken: process.env.CLOUDFLARE_API_TOKEN!,
    }),
  }),
  from: { address: 'sender@example.com', name: 'Sender' },
  to: ['first@example.com', 'second@example.com'],
  subject: 'Welcome',
  jsx: (
    <Html>
      <Body>
        <Text>Hello from the Cloudflare REST API.</Text>
      </Body>
    </Html>
  ),
})

if (receipt.successful && receipt.queued) {
  console.log('Queued recipients:', receipt.queuedRecipients)
}
```

## Components

- `Html`
- `Head`
- `Body`
- `Box`
- `Card`
- `Container`
- `Flex`
- `Grid`
- `Section`
- `Row`
- `Column`
- `Spacer`
- `Text`
- `Heading`
- `Button`
- `Link`
- `Img`
- `List`
- `ListItem`
- `CodeInline`
- `CodeBlock`
- `Preview`
- `Hr`
- `Font`
- `ColorScheme`
- `Conditional`
- `Tailwind`
- `Markdown`

Notes:

- `Button` and `Link` default to `target="_blank"`
- `Preview` renders hidden preview text
- `Text` defaults to `font-size: 14px`, `line-height: 24px`, and vertical `16px` margins
- `Hr` defaults to `border-top: 1px solid #eaeaea`
- `Heading` accepts shorthand margin props such as `m`, `mx`, `my`, `mt`, `mr`, `mb`, and `ml`
- `Flex` renders table-based layout instead of CSS `display:flex`
- `Grid` renders table-based columns instead of CSS `display:grid`
- `Card` renders a bordered table container with configurable padding and colors
- `List` and `ListItem` provide email-oriented spacing defaults for ordered and unordered lists
- `Spacer` renders explicit email-safe spacing
- `Conditional` renders Outlook conditional comments and is still validated in strict mode

## Strict Mode

Strict mode is enabled by default in `render()`. It is meant to fail early on markup and CSS that are risky for HTML email clients.

Representative error cases:

- Interactive or embedded tags such as `form`, `input`, `button`, `select`, `textarea`, `iframe`, `picture`, `source`, `svg`, and `script`
- `<a>` without `href`
- `<link rel="stylesheet">` tags (disallowed in strict mode)
- `<style>` outside `<Head>`
- `display:grid`, `display:inline-grid`, and `display:inline-flex`
- Logical properties such as `padding-inline`, `margin-block`, and `border-inline`
- Unsupported tags/CSS inside Outlook conditional comments (`<!--[if mso]>...<![endif]-->`)

Representative compatibility-sensitive cases include:

- `display:flex`
- `position`
- `object-fit` / `object-position`
- `background-image`
- `@font-face`
- `@media`
- `<img>` without `alt`

## Testing

Strict-mode **errors** (unsupported tags, unsafe URLs, risky CSS) already reject the `render()` promise, so they fail tests as-is.

Compatibility **warnings** are returned on `result.warnings` and, by default, logged with `console.warn`. To make warnings fail a test, pass `onWarning: 'error'` so `render()` throws when any warning is collected.

```ts
import { expect, test } from 'vitest'
import { render } from 'hono-email'
import { WelcomeEmail } from './welcome-email'

// Fail the test on any compatibility warning.
const renderEmail = (jsx: Parameters<typeof render>[0]) => render(jsx, { onWarning: 'error' })

test('welcome email renders without warnings', async () => {
  await expect(renderEmail(<WelcomeEmail />)).resolves.toBeDefined()
})

// Or assert on the collected warnings directly.
test('welcome email has no warnings', async () => {
  const { warnings } = await render(<WelcomeEmail />, { onWarning: 'silent' })
  expect(warnings).toEqual([])
})
```

Use `onWarning: 'silent'` to inspect `result.warnings` without console output, or pass a callback to route warnings into your own collector.

## Font

`<Font>` renders `@font-face` and a fallback `font-family` declaration inside `<Head>`

Please note `@font-face` is not available for some clients, so it is recommended to set `fallbackFontFamily`. [see](https://www.caniemail.com/features/css-at-font-face/)

```tsx
import { Font, Head, Html, render } from 'hono-email'

const { html } = await render(
  <Html>
    <Head>
      <Font
        fallbackFontFamily={['Arial', 'sans-serif']}
        fontFamily="Inter"
        fontWeight={400}
        webFont={{
          url: 'https://example.com/inter.woff2',
          format: 'woff2',
        }}
      />
    </Head>
  </Html>,
)
```

## Styling

`hono-email` provides multiple types of styling.

### Basic

```tsx
import { Body, Html, Text, render } from 'hono-email'

const { html } = await render(
  <Html>
    <Body>
      <Text style={{ color: '#0f172a' }}>Hello</Text>
    </Body>
  </Html>,
)
```

### hono/css (CSS-in-JS)

You can use `hono/css` class names directly on normal elements (`<div>`, `<Text>`, etc.).
`render()` automatically converts matching class rules to email-safe inline styles.

`<Head><Style /></Head>` is required when using `hono/css`.

```tsx
import { Style, css } from 'hono/css'
import { Body, Head, Html, Text, render } from 'hono-email'

const titleClass = css`
  color: #0f172a;
  padding-left: 1rem;
  padding-right: 1rem;
  font-weight: bold;
`

const { html } = await render(
  <Html>
    <Head>
      <Style />
    </Head>
    <Body>
      <Text className={titleClass}>Hello</Text>
    </Body>
  </Html>,
)
```

### Tailwind

If you are using `<Tailwind>` component, we recommend using a bundler (Vite, Rolldown, Webpack, Esbuild etc) and the `EmailTailwind` plugin.

```tsx
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import EmailTailwind from '@hono-email/tailwind-plugin/vite'

export default defineConfig({
  plugins: [tailwindcss(), EmailTailwind()],
})
```

For CommonJS Webpack config files, use the webpack subpath export.

```js
// webpack.config.cjs
const EmailTailwind = require('@hono-email/tailwind-plugin/webpack').default

module.exports = {
  plugins: [EmailTailwind()],
}
```

This plugin automatically finds `<Tailwind>` and automatically injects Tailwind styles.

```tsx
import { Body, Head, Html, Tailwind, Text, render } from 'hono-email'

const { html } = await render(
  <Html>
    <Head />
    <Tailwind>
      <Body>
        <Text className="text-brand bg-brand px-4 py-2">Hello</Text>
      </Body>
    </Tailwind>
  </Html>,
)
```

Base utilities are inlined as `style` attributes, and responsive (`sm:`) styles are relocated into `<head>`. Single-element pseudo-class variants such as `hover:` and `focus:` are kept in `<head>` with email-safe renamed class names (`hover:bg-blue-500` → `hover-bg-blue-500`). Combinator variants such as `group-hover:` and `peer-*` are not supported and are dropped with a warning.

When using Tailwind for frontend styling, we recommend using `@source` with `not` to exclude emails from being scanned by the frontend Tailwind build.

```css
@import 'tailwindcss';

@source not "./emails";
```

#### Passing an artifact explicitly

If you are not using a bundler plugin, use `buildTailwindArtifactFromCss()`.

```tsx
import { Body, Head, Html, Tailwind, Text, buildTailwindArtifactFromCss, render } from 'hono-email'

const artifact = buildTailwindArtifactFromCss({
  css: `
    @layer utilities {
      .bg-brand { background-color: #0f172a; }
      .text-white { color: #ffffff; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    }
  `,
})

const { html } = await render(
  <Html>
    <Head />
    <Tailwind artifact={artifact}>
      <Body>
        <Text className="bg-brand text-white px-4 py-2">Hello</Text>
      </Body>
    </Tailwind>
  </Html>,
)
```

## Markdown

`<Markdown>` converts GFM into HTML and applies email-friendly inline styles by default. Sanitization is enabled by default.

```tsx
import { Body, Head, Html, Markdown, render } from 'hono-email'

const { html } = await render(
  <Html lang="en">
    <Head>
      <title>Markdown example</title>
    </Head>
    <Body>
      <Markdown
        markdownContainerStyles={{
          padding: '12px',
          border: '1px solid #111827',
        }}
        markdownCustomStyles={{
          h1: { color: '#dc2626' },
          codeInline: {
            backgroundColor: '#e5e7eb',
            padding: '2px 4px',
          },
        }}
      >{`
# Markdown email

| Name | Role |
| --- | --- |
| Taro | Builder |
      `}</Markdown>
    </Body>
  </Html>,
)
```

### Markdown with Tailwind classes

When you render Markdown inside `<Tailwind>`, you can switch Markdown to class-based mode so Tailwind utilities control the styling.
`markdownStyleMode="tailwind"` is only supported inside `<Tailwind>` and throws otherwise.

```tsx
import { Body, Head, Html, Markdown, Tailwind, render } from 'hono-email'

const { html } = await render(
  <Html lang="en">
    <Head />
    <Tailwind>
      <Body>
        <Markdown
          markdownStyleMode="tailwind"
          markdownContainerClassName="prose text-slate-900"
          markdownCustomClassNames={{
            h1: 'text-2xl font-semibold',
            p: 'mb-3',
            codeInline: 'bg-slate-100 px-1 rounded',
          }}
        >{`
# Markdown email

Paragraph with \`code\`
        `}</Markdown>
      </Body>
    </Tailwind>
  </Html>,
)
```

`markdownCustomStyles` and `markdownContainerStyles` are still available in this mode if you want to mix class-based and inline overrides.

## Development

```sh
bun i
bun run build
bun run test
bun run typecheck
```

## Credits

This project is inspired by [react-email](https://github.com/resend/react-email) and [jsx-email](https://github.com/shellscape/jsx-email). Thanks to everyone involved in these projects.
