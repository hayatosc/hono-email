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

## Documentation

For advanced usages such as transport adapters, Markdown, `hono/css`, Tailwind CSS, and CLI tools, please check the [Documentation Site](https://hono-email.hayatosc.dev).
