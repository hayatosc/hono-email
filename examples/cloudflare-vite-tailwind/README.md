# Cloudflare + Vite + Hono + Tailwind Example

An example using `hono-email` in cloudflare workers environment.

- Hono
- Vite
- Cloudflare plugin
  - Using Cloudflare Email Sending
- Tailwind plugin (with `EmailTailwind` on `hono-email` )

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
