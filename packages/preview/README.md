# @hono-email/preview

[![npm version](https://img.shields.io/npm/v/@hono-email/preview)](https://www.npmjs.com/package/@hono-email/preview)
[![License](https://img.shields.io/npm/l/@hono-email/preview)](LICENSE)

`@hono-email/preview` is a live preview development server and CLI for `hono-email`. It lets you preview email templates in a web browser with real-time interactive props editing.

Full documentation is available at [hono-email.hayatosc.dev](https://hono-email.hayatosc.dev).

## Setup

Install the package as a development dependency:

```sh
npm i -D @hono-email/preview
```

## Running the Preview Server

Start the preview server with the `hono-email` CLI's `preview` command:

```sh
npx hono-email preview --dir ./emails
```

If you are using Bun:

```sh
bunx hono-email preview --dir ./emails
```

### Options

- `-d, --dir <path>`: The directory to search for email templates recursively (defaults to `./emails`).
- `-p, --port <port>`: The port to run the server on (defaults to `3000`).
- `-f, --file <path>`: A Vite config file to load into the preview server (not loaded by default, since a project's own `vite.config.*` is otherwise ignored).

## Interactive Props Schema

To enable structured props editing in the preview UI, export a `previewProps` configuration object alongside your default-exported email template component.

```tsx
import type { PreviewPropsConfig } from '@hono-email/preview'
import { Html, Body, Container, Heading, Text } from 'hono-email'

export const previewProps = {
  name: { type: 'string', default: 'Taro' },
  appName: { type: 'string', default: 'Acme' },
  trialDays: { type: 'number', default: 14 },
} satisfies PreviewPropsConfig

type WelcomeEmailProps = {
  name: string
  appName: string
  trialDays: number
}

export default function WelcomeEmail({ name, appName, trialDays }: WelcomeEmailProps) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>
            Welcome to {appName}, {name}!
          </Heading>
          <Text>You have {trialDays} days remaining in your free trial.</Text>
        </Container>
      </Body>
    </Html>
  )
}
```

## Documentation

For full schema documentation and advanced configurations, please check the [Documentation Site](https://hono-email.hayatosc.dev).
