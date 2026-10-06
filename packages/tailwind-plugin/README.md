# @hono-email/tailwind-plugin

[![npm version](https://img.shields.io/npm/v/@hono-email/tailwind-plugin)](https://www.npmjs.com/package/@hono-email/tailwind-plugin)
[![License](https://img.shields.io/npm/l/@hono-email/tailwind-plugin)](LICENSE)

`@hono-email/tailwind-plugin` compiles Tailwind CSS and injects serialized artifacts into `<Tailwind>` components at build time. It supports Vite, Rollup, Rolldown, Webpack, Rspack, Esbuild, Farm, and Bun. Email builds need no host Tailwind plugin, CSS loader, or CSS `?inline` support. The generated artifact uses the same format as `buildTailwindArtifactFromCss()`.

Full documentation is available at [hono-email.hayatosc.dev](https://hono-email.hayatosc.dev).

The plugin owns the compilation version: it uses the `tailwindcss`, `@tailwindcss/node`, and `@tailwindcss/oxide` versions declared in its dependencies, and resolves its own matching Tailwind stylesheet. Your application's installed Tailwind version does not select the compiler version. Custom CSS imports and configuration modules resolve from the host project root.

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
import EmailTailwind from '@hono-email/tailwind-plugin/vite'

export default defineConfig({
  plugins: [EmailTailwind()],
})
```

### Esbuild

```ts
import { build } from 'esbuild'
import EmailTailwind from '@hono-email/tailwind-plugin/esbuild'

await build({
  entryPoints: ['emails/welcome.tsx'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/welcome.mjs',
  jsx: 'automatic',
  jsxImportSource: 'hono/jsx',
  plugins: [EmailTailwind()],
})
```

### Bun

```ts
import EmailTailwind from '@hono-email/tailwind-plugin/bun'

await Bun.build({
  entrypoints: ['emails/welcome.tsx'],
  target: 'bun',
  outdir: 'dist',
  jsx: { runtime: 'automatic', importSource: 'hono/jsx' },
  plugins: [EmailTailwind()],
})
```

Each bundler has a corresponding subpath: `/vite`, `/rollup`, `/rolldown`, `/webpack`, `/rspack`, `/esbuild`, `/farm`, and `/bun`. Configure JSX compilation for `hono/jsx` in your bundler or TypeScript config:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  }
}
```

### Custom CSS and classes

```ts
EmailTailwind({
  configPath: './tailwind.config.ts',
  css: '@import "./email-theme.css"; @theme { --color-brand: #123456; }',
  safelist: ['text-brand', 'sm:text-brand'],
})
```

The plugin uses Tailwind's candidate scanner, including automatic source discovery and additive `@source` directives. Classes in shared imported components are included when their source files are inside the scanning root; use `@source` in `css` for files outside it. Dynamic class names must be safelisted or written as complete strings in source files.

Automatic discovery starts at the bundler's project root when available, otherwise the current working directory. Relative CSS imports and `configPath` resolve from that root; imports inside a config or stylesheet resolve from the importing file's directory. Keep generated JavaScript output ignored by `.gitignore` or `@source not`, so it does not become candidate input on later builds.

Imported stylesheets, configuration dependencies, scanned files, and source directories are watched. Rebuilds recreate the compiler and scanner, and Vite development updates invalidate affected artifact modules. Artifact construction runs in the build process using the shared pure CSS builder; generated email modules contain no artifact-builder imports.

The low-level `buildPerFileArtifactModule(encodedPath, options)` helper now returns `Promise<string>`. The deprecated `runtimeModuleSpecifier` option is accepted for compatibility and has no effect.

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

For other bundler integrations and styling options, please check the [Documentation Site](https://hono-email.hayatosc.dev).
