# AGENTS.md

## Project overview

`hono-email` is an ESM library that renders HTML email (and derived plain text) from `hono/jsx`.
It focuses on:

1. Email-oriented JSX primitives (`Html`, `Body`, `Button`, `Markdown`, `Tailwind`, etc.)
2. Output normalization (semantic tag normalization, preview relocation, head-style relocation)
3. Strict email validation with fail-fast errors and compatibility warnings
4. Tailwind artifact generation/consumption for email-safe style output
5. Output transforms (three-digit hex expansion, optional widow control, default minification)
6. Transport adapters for sending rendered email via `sendEmail()` (SMTP, Resend, SendGrid, Postmark, Mailgun, Cloudflare Email)

## Entry points

- `hono-email` → runtime/components/`sendEmail` (`src/index.ts`)
- `hono-email/plugin` → Tailwind build-time plugin (`src/unplugin.ts`)
- `hono-email/adapter` → shared adapter and `sendEmail` types (`src/adapter/index.ts`)
- `hono-email/smtp`, `hono-email/smtp/*` → SMTP transport and runtime connectors (`src/adapter/smtp/*`, `src/adapter/platform/*`)
- `hono-email/resend`, `/sendgrid`, `/postmark`, `/mailgun` → provider HTTP adapters (`src/adapter/*`)
- `hono-email/cloudflare`, `/cloudflare/workers`, `/cloudflare/rest` → Cloudflare Email Service adapter (`src/adapter/cloudflare/*`)

## High-level render flow

`render()` (in `src/index.ts`) roughly does:

1. JSX fragment → HTML string (`src/render/html.ts`)
2. Normalize HTML — semantic tags, preview/head-style relocation (`src/normalize/*`), then inline `hono/css` and `<Tailwind>` output (`src/render/hono-css.ts`, `src/tailwind/`)
3. Strict validation (`src/validate/html.ts`) unless `strict: false`
4. Output transforms (`src/transform/*`): expand three-digit hex (always), optional widow control (`widows`), then add doctype and either pretty-print (`pretty`) or minify (default)
5. Always derive plain text from the HTML (`src/text/index.ts`); `render()` returns `{ html, text }`

## Key directories

- `src/components/index.tsx`: email primitives and higher-level components
- `src/render/`: JSX→HTML rendering, `hono/css` inlining, pretty-print
- `src/normalize/`: HTML normalization passes
- `src/validate/`: strict-mode validation and warnings
- `src/transform/`: output transforms (six-hex, prevent-widows, minify) and the shared text walker
- `src/markdown/`: Markdown rendering + sanitization
- `src/tailwind/`: Tailwind artifact handling and HTML transformation
- `src/text/`: plain-text conversion
- `src/adapter/`: transport adapters and `sendEmail` (SMTP, Resend, SendGrid, Postmark, Mailgun, Cloudflare Email)
- `src/unplugin.ts`: bundler plugin (Vite/Rollup/Webpack/etc.)
- Tests live next to the source files they cover as `*.test.ts` / `*.test.tsx`

## Strict-mode notes

- Strict mode is enabled by default.
- Validation checks include unsupported tags, risky CSS declarations/properties, style placement, anchor href requirements, stylesheet links, and image alt warnings.
- HTML comments are ignored for normal comments, but Outlook conditional-comment payloads are still validated.
- Errors throw and reject `render()`; warnings are collected on `RenderResult.warnings`. `onWarning` (`'warn'` default | `'error'` | `'silent'` | callback) controls how warnings are surfaced, so tests can fail on them.
- Tailwind combinator/pseudo-element variants that get dropped are reported as warnings through the same channel (markers encoded in `src/tailwind/`, extracted in `render()`).

## Development commands

- `bun test`
- `bun run typecheck`
- `bun run build`

When changing runtime behavior, update/add colocated tests next to the source file and keep README examples aligned with exported entry points.
