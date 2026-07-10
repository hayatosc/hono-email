# hono-email

[![npm version](https://img.shields.io/npm/v/hono-email)](https://www.npmjs.com/package/hono-email)
[![License](https://img.shields.io/npm/l/hono-email)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

`hono-email` is a lightweight, type-safe monorepo library for rendering HTML emails and plain text from `hono/jsx`. It focuses on rendering, normalization, validation, and email-oriented primitives.

Full documentation is available at **[hono-email.hayatosc.dev](https://hono-email.hayatosc.dev)**.

## Packages

This monorepo consists of the following packages:

| Package                                                        | Description                                                                             |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **[`hono-email`](/packages/core)**                             | Core rendering engine, email components, and transport adapters.                        |
| **[`@hono-email/tailwind-plugin`](/packages/tailwind-plugin)** | Bundler plugin (Vite, Rollup, Webpack, etc.) to compile and inject Tailwind CSS styles. |
| **[`@hono-email/preview`](/packages/preview)**                 | Dev server & CLI tool to preview templates with real-time interactive props editing.    |

## Key Features

- **Hono JSX syntax**: Write your email template naturally using JSX.
- **HTML + Plain Text**: Render beautiful HTML emails and matching plain text from a single JSX tree via `render()`.
- **Strict Validation**: Guard against risky CSS properties and unsupported tags with strict validation rules.
- **Styling Options**: Supports inline styles, `hono/css` (CSS-in-JS), and Tailwind CSS (build-time integration).
- **Transport Adapters**: Built-in integrations for SMTP, Resend, SendGrid, Postmark, Mailgun, and Cloudflare Email.

## Quick Start

### Installation

```sh
npm i hono-email
```

### Writing Templates

```tsx
import { Html, Head, Preview, Body, Container, Heading, Text, Button, render } from 'hono-email'

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

For full APIs, guide details, styling setup, adapters, and tools, please check the official documentation:

👉 **[https://hono-email.hayatosc.dev](https://hono-email.hayatosc.dev)**

## Development

To set up a local development environment, install [mise](https://mise.jdx.dev/) and run:

```sh
mise bootstrap
```

For more detailed information on running tests, builds, and CI locally, please refer to [CONTRIBUTING.md](CONTRIBUTING.md).

