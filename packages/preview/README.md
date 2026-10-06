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
- `--host <host>`: The server host (defaults to `127.0.0.1`).
- `-f, --file <path>`: A Vite config file to load into the preview server (not loaded by default, since a project's own `vite.config.*` is otherwise ignored).
- `--tailwind <on|off|auto>`: Select email Tailwind integration (defaults to `auto`).

### Tailwind Integration

Install the optional email plugin peer (version 0.9.0 or later) in the project containing your email templates. Earlier plugin releases require host CSS processing and are incompatible with this preview integration.

```sh
npm i -D @hono-email/tailwind-plugin@^0.9.0
npx hono-email preview --dir ./emails --tailwind on
```

Preview registers the email plugin to compile `<Tailwind>` artifacts using the project's `tailwind.config.*`, when present. The installed email plugin's matching Tailwind compiler and default stylesheet dependencies control the compiler version; the host project's `tailwindcss` version does not. No host Tailwind installation or Vite CSS tooling is required for `on`. Preview does not register `@tailwindcss/vite` or process the host application's CSS. A Vite config supplied with `--file` still loads its own plugins, including their custom `css` and `configPath` options.

The default `auto` mode preserves automatic detection for existing projects: it enables integration when `package.json` lists `tailwindcss` or `@tailwindcss/vite`, a `tailwind.config.*` exists, or a Vite/PostCSS config references `tailwindcss`. The explicitly supplied `--file` config also participates in detection. A generic PostCSS config alone does not enable Tailwind. The optional `tailwindcss` peer supports project discovery; it does not control email compilation. Detected integration requires the email plugin to resolve from the project.

Use `--tailwind off` to disable preview's integration even when your frontend dependencies include Tailwind. Use `--tailwind on` to enable it without relying on detection; a missing email plugin produces a startup error naming the required package. These controls apply to plugins registered by preview; plugins in an explicitly loaded Vite config follow that config.

The programmatic API accepts `true`, `false`, or `'auto'` (the default):

```ts
import { startPreviewServer } from '@hono-email/preview'

const server = await startPreviewServer({
  dir: './emails',
  port: 3000,
  tailwind: false,
})

// Close the server when your development process stops.
await server.close()
```

## Interactive Props Schema

To enable structured props editing in the preview UI, export a `previewProps` configuration object alongside your default-exported email template component. Without a default export, the module may instead contain one named component function alongside `previewProps`.

```tsx
import { definePreviewProps } from '@hono-email/preview'
import { Html, Body, Container, Heading, Text } from 'hono-email'

type WelcomeEmailProps = {
  name: string
  appName: string
  trialDays: number
}

export const previewProps = definePreviewProps<WelcomeEmailProps>()({
  name: { type: 'string', default: 'Taro' },
  appName: { type: 'string', default: 'Acme' },
  trialDays: { type: 'number', default: 14 },
})

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

`definePreviewProps<Props>()` checks field names, input types, defaults, select options, and object-array item schemas against `Props`. It returns the same configuration object and may describe only a subset of the component's props. Non-string fields require an explicit `type` or a non-null default so the form can infer their input type. Object arrays also require an `item` schema; primitive lists support string values. Use JSON mode for other array element types. Existing configuration objects using `satisfies PreviewPropsConfig` remain supported.

## Documentation

For full schema documentation and advanced configurations, please check the [Documentation Site](https://hono-email.hayatosc.dev).
