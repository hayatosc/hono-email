# hono-email

`hono-email` is an ESM library for rendering HTML email and plain text from `hono/jsx`. It focuses on rendering, normalization, validation, and email-oriented primitives. Transport and provider integrations are intentionally out of scope.

## Features

- Render HTML email from `hono/jsx`
- Render plain text from the same JSX tree through `render()`
- Keep strict email validation enabled by default
- Style markdown content with the `Markdown` component
- Apply Tailwind utility output through `Tailwind` build artifacts
- Expose bundler integrations through `hono-email/plugin`

## Entry Points

- `hono-email`
- `hono-email/plugin`

Note:
the current `package.json` is marked `"private": true`. This repository is currently maintained as a local library package rather than a published npm package.

## Setup

```sh
ni
```

## Quick Start

```tsx
import { Body, Button, Container, Head, Heading, Html, Preview, Text, render } from "hono-email";

function WelcomeEmail() {
  return (
    <Html lang="en">
      <Head>
        <title>Welcome</title>
      </Head>
      <Preview>Your account is ready.</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", color: "#1f2937" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "24px" }}>
          <Heading as="h1">Welcome</Heading>
          <Text>Thanks for signing up.</Text>
          <Button href="https://example.com/start">Get started</Button>
        </Container>
      </Body>
    </Html>
  );
}

const html = await render(<WelcomeEmail />);
const text = await render(<WelcomeEmail />, {
  output: "text",
  text: {
    headingStyle: "preserve",
    linkFormat: "text-only",
  },
});
```

## `render()`

`render()` is the primary runtime API.

- Returns HTML by default
- Returns plain text when `output: 'text'` is set
- Uses `strict: true` by default
- Accepts `doctype: 'html5' | 'xhtml-transitional' | false`
- Accepts plain-text options through the `text` field when `output: 'text'`

```tsx
const html = await render(<WelcomeEmail />);

const text = await render(<WelcomeEmail />, {
  output: "text",
  text: {
    linkFormat: "text-only",
    listBullet: "*",
  },
});
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

`Font` renders `@font-face` and a fallback `font-family` declaration inside `<Head>`. The current API accepts `webFont` directly.

```tsx
import { Font, Head, Html, render } from "hono-email";

const html = await render(
  <Html>
    <Head>
      <Font
        fallbackFontFamily={["Arial", "sans-serif"]}
        fontFamily="Inter"
        fontWeight={400}
        webFont={{
          url: "https://example.com/inter.woff2",
          format: "woff2",
        }}
      />
    </Head>
  </Html>,
);
```

## Markdown

`Markdown` converts GFM into HTML and applies email-friendly inline styles. Sanitization is enabled by default.

```tsx
import { Body, Head, Html, Markdown, render } from "hono-email";

const html = await render(
  <Html lang="en">
    <Head>
      <title>Markdown example</title>
    </Head>
    <Body>
      <Markdown
        markdownContainerStyles={{
          padding: "12px",
          border: "1px solid #111827",
        }}
        markdownCustomStyles={{
          h1: { color: "#dc2626" },
          codeInline: {
            backgroundColor: "#e5e7eb",
            padding: "2px 4px",
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
);
```

## Tailwind

`Tailwind` accepts a build artifact and expands matched utility classes into email-compatible output.

- Inline-capable declarations are merged into element `style` attributes
- Responsive utilities are emitted into `<Head>`
- Missing classes in the artifact fail at render time

### Recommended: `hono-email/plugin` with Vite

With Vite, `hono-email/plugin` injects the artifact import for `<Tailwind>` at build time.

```tsx
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { vitePlugin as honoEmailTailwind } from "hono-email/plugin";

export default defineConfig({
  plugins: [
    tailwindcss(),
    honoEmailTailwind({
      configPath: "./tailwind.config.ts",
      safelist: ["sm:text-blue-500"],
    }),
  ],
});
```

```tsx
import { Body, Head, Html, Tailwind, Text, render } from "hono-email";

const html = await render(
  <Html>
    <Head />
    <Tailwind>
      <Body>
        <Text className="text-brand bg-brand px-4 py-2 sm:text-blue-500">Hello</Text>
      </Body>
    </Tailwind>
  </Html>,
);
```

### Passing an artifact explicitly

If you are not using a bundler plugin, use `buildTailwindArtifactFromCss()`.

```tsx
import { Body, Head, Html, Tailwind, Text, buildTailwindArtifactFromCss, render } from "hono-email";

const artifact = buildTailwindArtifactFromCss({
  css: `
    @layer utilities {
      .bg-brand { background-color: #0f172a; }
      .text-white { color: #ffffff; }
      .px-4 { padding-inline: 1rem; }
      .py-2 { padding-block: 0.5rem; }
    }
  `,
});

const html = await render(
  <Html>
    <Head />
    <Tailwind artifact={artifact}>
      <Body>
        <Text className="bg-brand text-white px-4 py-2">Hello</Text>
      </Body>
    </Tailwind>
  </Html>,
);
```

## Development

```sh
bun run build
bun test
bun run typecheck
```

Runnable examples:

- `examples/basic`
- `examples/cloudflare-vite-tailwind`
