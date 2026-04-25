# Cloudflare + Vite + Hono + Tailwind Example

An example using `hono-email` in a Cloudflare Workers environment.

- Hono
- Vite
- Cloudflare plugin
  - Using Cloudflare Email Sending
- `sendEmail` from `hono-email`
- `CloudflareEmailAdapter` from `hono-email/cloudflare-email` with `WorkersConnector` from `hono-email/cloudflare-email/cloudflare`
- Tailwind plugin (with `EmailTailwind` on `hono-email`)

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
