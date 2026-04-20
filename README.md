# hono-email

`hono-email` is an ESM library for rendering HTML email and plain text from `hono/jsx`. It focuses on rendering, normalization, validation, and email-oriented primitives.

> [!WARNING]
> This project is in the early stages of development. APIs and other elements are subject to change in the future.

## Features

- Render HTML email from `hono/jsx`
- Render plain text from the same JSX tree through `render()`
- Keep strict email validation enabled by default
- Style markdown content with the `Markdown` component
- Use `hono/css` class-based CSS-in-JS as a styling option
- Apply Tailwind utility output through `Tailwind` build artifacts
- Expose bundler integrations through `hono-email/plugin`

## Setup

```sh
npm install hono-email
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

const html = await render(<WelcomeEmail />)
const text = await render(<WelcomeEmail />, {
  output: 'text',
  text: {
    headingStyle: 'preserve',
    linkFormat: 'text-only',
  },
})
```

## `render()`

`render()` is the primary runtime API.

- Returns HTML by default
- Returns plain text when `output: 'text'` is set
- Uses `strict: true` by default
- Accepts `doctype: 'html5' | 'xhtml-transitional' | false`
- Accepts plain-text options through the `text` field when `output: 'text'`

```tsx
const html = await render(<WelcomeEmail />)

const text = await render(<WelcomeEmail />, {
  output: 'text',
  text: {
    linkFormat: 'text-only',
    listBullet: '*',
  },
})
```

## Type-safe template helpers

`defineEmail()` and `renderTemplate()` let you keep email props strongly typed without manually writing JSX at each call site.

```tsx
import { defineEmail, renderTemplate } from 'hono-email'

type WelcomeEmailProps = {
  name: string
  inviteUrl: string
}

const WelcomeEmail = ({ name, inviteUrl }: WelcomeEmailProps) => (
  <Html>
    <Body>
      <Text>Hello {name}</Text>
      <Button href={inviteUrl}>Open invitation</Button>
    </Body>
  </Html>
)

const welcomeEmail = defineEmail(WelcomeEmail)

const html = await welcomeEmail.render({
  name: 'Hayato',
  inviteUrl: 'https://example.com/invite',
})

const text = await renderTemplate(
  WelcomeEmail,
  { name: 'Hayato', inviteUrl: 'https://example.com/invite' },
  { output: 'text' },
)
```

## Components

- `Html`
- `Head`
- `Body`
- `Container`
- `Section`
- `Row`
- `Column`
- `Text`
- `Heading`
- `Button`
- `Link`
- `Img`
- `Preview`
- `Hr`
- `Font`
- `Tailwind`
- `Markdown`

Notes:

- `Button` and `Link` default to `target="_blank"`
- `Preview` renders hidden preview text
- `Text` defaults to `font-size: 14px`, `line-height: 24px`, and vertical `16px` margins
- `Hr` defaults to `border-top: 1px solid #eaeaea`
- `Heading` accepts shorthand margin props such as `m`, `mx`, `my`, `mt`, `mr`, `mb`, and `ml`

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

## Font

`<Font>` renders `@font-face` and a fallback `font-family` declaration inside `<Head>`

Please note `@font-face` is not available for some clients, so it is recommended to set `fallbackFontFamily`. [see](https://www.caniemail.com/features/css-at-font-face/)

```tsx
import { Font, Head, Html, render } from 'hono-email'

const html = await render(
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

const html = await render(
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

const html = await render(
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
import { vitePlugin as EmailTailwind } from 'hono-email/plugin'

export default defineConfig({
  plugins: [tailwindcss(), EmailTailwind()],
})
```

This plugin automatically finds `<Tailwind>` and automatically injects Tailwind styles.

```tsx
import { Body, Head, Html, Tailwind, Text, render } from 'hono-email'

const html = await render(
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

const html = await render(
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

const html = await render(
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

const html = await render(
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
bun test
bun run typecheck
```

## Credits

This project is inspired by [react-email](https://github.com/resend/react-email) and [jsx-email](https://github.com/shellscape/jsx-email). Thanks to everyone involved in these projects.
