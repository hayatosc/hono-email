# AGENTS.md

## Project overview

`hono-email` is a monorepo library designed to render HTML email (and derived plain text) from `hono/jsx`. It contains the following packages:

1. **`hono-email` (`packages/core`)**: The core library providing email-oriented JSX primitives, output normalization, strict email validation, output transforms, and transport adapters.
2. **`@hono-email/tailwind-plugin` (`packages/tailwind-plugin`)**: A build-time bundler plugin (supporting Vite, Rollup, Rolldown, Webpack, Rspack, Esbuild, Farm, and Bun) that precompiles and injects Tailwind CSS artifacts into components.
3. **`@hono-email/preview` (`packages/preview`)**: A live preview server and CLI (`hono-email preview`) that recursively discovers templates and provides real-time props editing via a structured form.

## Entry points

- `hono-email` → Core rendering and primitives (`packages/core/src/index.ts`)
- `hono-email/adapter` → Shared transport adapter interface and `sendEmail` helper types (`packages/core/src/adapter/index.ts`)
- `hono-email/smtp`, `hono-email/smtp/*` → SMTP transport and runtime connectors (`packages/core/src/adapter/smtp/*`, `packages/core/src/adapter/platform/*`)
- `hono-email/resend`, `/sendgrid`, `/postmark`, `/mailgun`, `/provider` → Provider-specific HTTP adapters (`packages/core/src/adapter/*`)
- `hono-email/cloudflare`, `/cloudflare/workers`, `/cloudflare/rest` → Cloudflare Email Service adapter (`packages/core/src/adapter/cloudflare/*`, `packages/core/src/adapter/platform/cloudflare/*`)
- `@hono-email/tailwind-plugin` → Bundler plugin factory (`packages/tailwind-plugin/src/index.ts` with subpaths like `/vite`, `/webpack`, etc.)
- `@hono-email/preview` → Live preview server engine and types (`packages/preview/src/index.ts`)

## High-level render flow

`render()` (in `packages/core/src/index.ts`) roughly does:

1. JSX fragment → HTML string (`packages/core/src/render/html.ts`)
2. Normalize HTML — semantic tags, preview/head-style relocation (`packages/core/src/normalize/*`), then inline `hono/css` and `<Tailwind>` output (`packages/core/src/render/hono-css.ts`, `packages/core/src/tailwind/`)
3. Strict validation (`packages/core/src/validate/html.ts`) unless `strict: false`
4. Output transforms (`packages/core/src/transform/*`): expand three-digit hex (always), optional widow control (`widows`), then add doctype and either pretty-print (`pretty`) or minify (default)
5. Always derive plain text from the HTML (`packages/core/src/text/index.ts`); `render()` returns `{ html, text, warnings }`

## Key directories

- `packages/core/src/components/index.tsx`: Email primitives and higher-level components
- `packages/core/src/render/`: JSX→HTML rendering, `hono/css` inlining, pretty-print
- `packages/core/src/normalize/`: HTML normalization passes
- `packages/core/src/validate/`: Strict-mode validation and warnings
- `packages/core/src/transform/`: Output transforms (six-hex, prevent-widows, minify) and the shared text walker
- `packages/core/src/markdown/`: Markdown rendering + sanitization
- `packages/core/src/tailwind/`: Tailwind artifact handling and HTML transformation
- `packages/core/src/text/`: Plain-text conversion
- `packages/core/src/adapter/`: Transport adapters and `sendEmail` implementation
- `packages/tailwind-plugin/src/`: Bundler integration code using `unplugin`
- `packages/preview/src/`: Live preview server, CLI, client UI, template discovery, and props extraction
- Tests live next to the source files they cover as `*.test.ts` / `*.test.tsx`

## Strict-mode notes

- Strict mode is enabled by default.
- Validation checks include unsupported tags, risky CSS declarations/properties, style placement, anchor href requirements, stylesheet links, and image alt warnings.
- HTML comments are ignored for normal comments, but Outlook conditional-comment payloads are still validated.
- Errors throw and reject `render()`; warnings are collected on `RenderResult.warnings`. `onWarning` (`'warn'` default | `'error'` | `'silent'` | callback) controls how warnings are surfaced, so tests can fail on them.
- Tailwind combinator/pseudo-element variants that get dropped are reported as warnings through the same channel (markers encoded in `packages/core/src/tailwind/`, extracted in `render()`).

## Development commands

Use `mise run ci` to run the full CI check locally (format, lint, typecheck, test, build). This uses `actrun` under the hood to replay the GitHub Actions CI workflow locally using the configurations in `actrun.toml`.

Individual commands for quick checks:

- `bun test` (runs unit tests across all packages)
- `bun run typecheck` (typechecks all packages with `tsgo`)
- `bun run build` (builds all packages in the monorepo)
- `bun run lint`
- `bun run format`

When changing runtime behavior, update/add colocated tests next to the source file and keep README examples aligned with exported entry points.
