# @hono-email/tailwind-plugin

[![npm version](https://img.shields.io/npm/v/@hono-email/tailwind-plugin)](https://www.npmjs.com/package/@hono-email/tailwind-plugin)
[![License](https://img.shields.io/npm/l/@hono-email/tailwind-plugin)](LICENSE)

`@hono-email/tailwind-plugin` is a build-time bundler plugin supporting Vite, Rollup, Rolldown, Webpack, Esbuild, Farm, and Bun. It compiles and injects Tailwind CSS styles dynamically into `<Tailwind>` components for `hono-email`.

Full documentation is available at [hono-email.hayatosc.dev](https://hono-email.hayatosc.dev).

## Setup

```sh
npm i -D @hono-email/tailwind-plugin
```

## Configuration

Register the plugin in your bundler configuration file.

### Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import EmailTailwind from '@hono-email/tailwind-plugin/vite'

export default defineConfig({
  plugins: [tailwindcss(), EmailTailwind()],
})
```

### Webpack

```js
// webpack.config.cjs
const EmailTailwind = require('@hono-email/tailwind-plugin/webpack').default

module.exports = {
  plugins: [EmailTailwind()],
}
```

## Usage

Once configured, wrap your templates with the `<Tailwind>` component. The bundler plugin will automatically process and inject the Tailwind styles at build time.

```tsx
import { Body, Head, Html, Tailwind, Text, render } from 'hono-email'

const { html } = await render(
  <Html>
    <Head />
    <Tailwind>
      <Body>
        <Text className="text-blue-600 bg-gray-50 px-4 py-2">Hello World</Text>
      </Body>
    </Tailwind>
  </Html>,
)
```

## Documentation

For other bundler integrations (Rollup, Rolldown, Esbuild, Farm, Bun) and styling options, please check the [Documentation Site](https://hono-email.hayatosc.dev).
