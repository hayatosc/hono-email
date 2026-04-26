# AGENTS.md

## Project overview

`hono-email` is an ESM library that renders HTML email (and derived plain text) from `hono/jsx`.
It focuses on:

1. Email-oriented JSX primitives (`Html`, `Body`, `Button`, `Markdown`, `Tailwind`, etc.)
2. Output normalization (semantic tag normalization, preview relocation, head-style relocation)
3. Strict email validation with fail-fast errors and compatibility warnings
4. Tailwind artifact generation/consumption for email-safe style output

Transport/provider integration (SES, Resend, SMTP, etc.) is intentionally out of scope.

## Entry points

- `hono-email` → runtime/components (`src/index.ts`)
- `hono-email/plugin` → Tailwind build-time plugin (`src/unplugin.ts`)

## High-level render flow

`render()` (in `src/index.ts`) roughly does:

1. JSX fragment → HTML string (`src/render/html.ts`)
2. Normalize HTML (`src/normalize/*`)
3. Strict validation (`src/validate/html.ts`) unless `strict: false`
4. Add doctype / optional pretty output
5. Optional plain-text conversion (`src/text/index.ts`) when `output: 'text'`

## Key directories

- `src/components/index.tsx`: email primitives and higher-level components
- `src/normalize/`: HTML normalization passes
- `src/validate/`: strict-mode validation and warnings
- `src/markdown/`: Markdown rendering + sanitization
- `src/tailwind/`: Tailwind artifact handling and HTML transformation
- `src/unplugin.ts`: bundler plugin (Vite/Rollup/Webpack/etc.)
- Tests live next to the source files they cover as `*.test.ts` / `*.test.tsx`

## Strict-mode notes

- Strict mode is enabled by default.
- Validation checks include unsupported tags, risky CSS declarations/properties, style placement, anchor href requirements, stylesheet links, and image alt warnings.
- HTML comments are ignored for normal comments, but Outlook conditional-comment payloads are still validated.

## Development commands

- `bun test`
- `bun run typecheck`
- `bun run build`

When changing runtime behavior, update/add colocated tests next to the source file and keep README examples aligned with exported entry points.
