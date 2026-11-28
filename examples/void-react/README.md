# Void Framework + React email example

A React form invokes a Void page action, which renders a welcome email with `hono-email` and passes it to the Void SDK through `VoidEmailAdapter`. React renders the site; `hono/jsx` renders the email in `src/welcome-email.tsx` on the server.

## Run locally

From the repository root, with the Node.js and Bun versions in `mise.toml`:

```sh
ni
nr build
cd examples/void-react
nr dev --host 127.0.0.1
```

1. Open the local site URL printed by Vite, enter a name, and select **Capture welcome email**.
2. Open the **Email inbox** URL printed by Void in the terminal. Keep its access token private.
3. Open **Your local welcome email** or download the `.eml` to inspect the HTML and plain-text parts.

The sample uses fixed `example.com` addresses. The inbox captures mail locally without credentials or external delivery. The form and its send action are disabled in production builds.

## Checks

After building the workspace packages, run these commands from `examples/void-react`:

```sh
nr typecheck
nr test
nr build
```

The test uses Void's email test harness to verify the rendered HTML and plain text without starting the dev server.
