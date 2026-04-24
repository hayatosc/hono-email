# Cloudflare + Vite + Hono + Tailwind Example

This is a runnable example that uses `hono-email/plugin` to inject the `<Tailwind>` artifact at build time.
The example has its own `package.json` and keeps the frontend intentionally minimal: a server-rendered Hono JSX send form.
Email delivery uses `hono-email/cloudflare-email/cloudflare` with `WorkersConnector()`.
Inside this repository, the example resolves `hono-email`, `hono-email/plugin`, `hono-email/cloudflare-email`, and `hono-email/cloudflare-email/cloudflare` to `../../src` via local aliasing, so `ni` does not need a linked package install.
The Hono route reads bindings and vars with `env(c)` from `hono/adapter`.
Cloudflare binding types still come from generated `worker-configuration.d.ts` for the Worker runtime.

Frontend and email styling are intentionally separated:

- `src/style.css` builds the browser-facing Tailwind CSS for the send form
- `hono-email/plugin` scans `src/emails` only, so the email artifact contains email classes only

## Commands

Run these commands inside the example directory.

```sh
cd examples/cloudflare-vite-tailwind
ni
nr cf-typegen
nr dev
```

Build and preview:

```sh
nr build
nr preview
```

Deploy to Cloudflare Workers:

```sh
nr deploy
```

## Routes

- `GET /`
  - minimal send form rendered with Hono JSX
- `POST /send`
  - sends the form payload through `sendEmail()` and Cloudflare Email Service

Send example:

```sh
curl -X POST "http://127.0.0.1:5173/send" \
  -H "content-type: application/x-www-form-urlencoded" \
  --data-urlencode "to=recipient@example.com" \
  --data-urlencode "subject=テスト送信" \
  --data-urlencode "message=こんにちは。%0A%0ACloudflare Email Service から送っています。"
```

## Optional Email Binding

To send real email, configure `send_email` and `vars` in `wrangler.jsonc`.
By default, this example keeps the binding local so `nr dev` works without a Cloudflare login.
If you want real delivery during local development, add `remote: true` to the `send_email` binding and log in to Cloudflare first.

```jsonc
{
  "send_email": [{ "name": "EMAIL" }],
  "vars": {
    "EMAIL_FROM": "welcome@example.com",
    "EMAIL_FROM_NAME": "hono-email",
  },
}
```

Notes:

- Set `EMAIL_FROM` to an address that is allowed by your Cloudflare Email Service configuration.
- The `to` field supports multiple recipients separated by commas.
- Actual delivery depends on your Cloudflare Email Service domain setup and permissions.
- For real delivery in `nr dev`, switch the binding to `{ "name": "EMAIL", "remote": true }` and authenticate with Cloudflare.
- After changing `send_email` bindings or `vars`, rerun `nr cf-typegen`.
