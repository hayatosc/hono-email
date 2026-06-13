# Cloudflare + Vite + Hono + Tailwind Example

An example using `hono-email` in a Cloudflare Workers environment.

- Hono
- Vite
- Cloudflare plugin
  - Using Cloudflare Email Sending
- `sendEmail` from `hono-email`
- `CloudflareEmailAdapter` from `hono-email/cloudflare` with `WorkersConnector` from `hono-email/cloudflare/workers`
- Tailwind plugin (with `EmailTailwind` from `@hono-email/tailwind-plugin/vite`)

## Commands

Dev:

```sh
cd examples/cloudflare-vite-tailwind
bun install
bun run typegen
bun run dev
```

Build and preview:

```sh
bun run build
bun run preview
```

Deploy to Cloudflare Workers:

```sh
bun run deploy
```
