# Changelog

## [0.7.0] - 2026-06-30

### caniemail.com-driven Strict Validation

Strict-mode validation is now derived entirely from [caniemail.com](https://www.caniemail.com/) data. A bundled snapshot (`caniemail-data.json`) is used at runtime; run `nr update-caniemail` to refresh it from the live API.

- Tags, CSS properties, CSS declarations, and CSS at-rules are classified by support ratio across all tracked email clients: ≥80% → allowed, 50–79% → warning, <50% → error. Partial (`a`) support counts as supported.
- Security-critical tags (`script`, `iframe`, `embed`, `object`, `applet`, `form`) are always blocked regardless of ratio.
- Error and warning messages now include a direct link to the relevant caniemail.com page.
- The minimum supported Node.js version is raised to v22 (required for `import … with { type: 'json' }`).

### Per-client Compatibility Warnings (`warningClients`)

Added a `warningClients` option to `render()` and `renderAsync()`:

```ts
import { render } from 'hono-email'
import type { EmailClient } from 'hono-email'

const { html, text, warnings } = await render(<Email />, {
  warningClients: ['outlook', 'gmail'],
})
// warnings will include entries like:
// "The CSS property 'display:grid' is not supported in Outlook. See: https://..."
```

Supported clients: `'outlook'`, `'gmail'`, `'apple-mail'`, `'yahoo'`. When a client is listed and a used feature is unsupported for that client, a warning is emitted (controlled by `onWarning`). This is additive — threshold-based errors still throw.

- feat(core): derive strict-mode validation from caniemail.com data (#89, #90)
- feat(core): add `warningClients` option for per-client compatibility warnings
- fix(core): add import attribute for JSON module; bump Node.js minimum to v22

## [0.4.0] - 2026-05-16

### Add Provider Adapters

Added first-party email provider adapters for Resend, SendGrid, Postmark, and Mailgun. These adapters send directly with `fetch`, support the shared `sendEmail()` flow, and map provider responses into `SendEmailReceipt`.

### Add Email Layout Helpers

Added email-safe layout and content primitives including `Box`, `Card`, `Flex`, `Grid`, `Spacer`, `List`, `ListItem`, `CodeInline`, `CodeBlock`, `ColorScheme`, and `Conditional`. `Flex` and `Grid` render table-based layouts for email client compatibility, and Outlook conditional comments remain covered by strict validation.

### Build and Plugin Updates

Migrated the build to `tsdown`, added provider entry points, and changed the Tailwind plugin package to named exports such as `vitePlugin`, `webpackPlugin`, and `EmailTailwindUnplugin`.

- feat: add email provider adapters (Resend, SendGrid, Postmark, Mailgun) (#24)
- chore: fix cloudflare adapter file structure
- chore: change build settings (#22)
- feat: add email layout helper components (#21)

## [0.3.2] - 2026-04-28

- feat: add commonjs plugin entry (#19)
- fix: harden adapters and font css
- fix: harden email validation and headers

## [0.3.1] - 2026-04-26

- refactor: split rendering and validation internals (#17)
- feat: add attachment support for smtp and cloudflare adapters (#16)
- feat(smtp): add dkim envelope and verify support (#15)
- fix: resolve CodeQL code scanning security alerts (#14)

## [0.3.0] - 2026-04-25

### Add SMTP Connector

Added native support for sending via SMTP protocol. It works in any runtime, including Node.js, Bun, Deno, and Cloudflare Workers.

```tsx
import CloudflareConnector from 'hono-email/smtp/cloudflare'
import { Body, Html, Text, sendEmail } from 'hono-email'
import { SmtpTransport } from 'hono-email/smtp'

const smtp = new SmtpTransport({
  connector: CloudflareConnector,
  hostname: 'smtp.example.com',
  port: 587,
  secure: 'starttls',
  auth: {
    username: 'smtp-user',
    password: 'smtp-password',
  },
  pool: {
    maxConnections: 2,
  },
})

try {
  const receipt = await sendEmail({
    adapter: smtp,
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Welcome',
    jsx: (
      <Html>
        <Body>
          <Text>Hello from hono-email.</Text>
        </Body>
      </Html>
    ),
  })

  if (!receipt.successful) {
    console.error(receipt.errorMessages)
  }
} finally {
  await smtp.close()
}
```

### Add Cloudflare Email Service Adapter

We have added an adapter for [Cloudflare Email Service](https://developers.cloudflare.com/email-service/) . It functions as a Workers Binding when running on Cloudflare Workers, and as a REST API in other runtimes.

```tsx
import { Body, Html, Text, sendEmail } from 'hono-email'
import { CloudflareEmailAdapter } from 'hono-email/cloudflare'
import WorkersConnector from 'hono-email/cloudflare/workers'

export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    const receipt = await sendEmail({
      adapter: CloudflareEmailAdapter({ connector: WorkersConnector }),
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Welcome',
      jsx: (
        <Html>
          <Body>
            <Text>Hello from Cloudflare Workers.</Text>
          </Body>
        </Html>
      ),
    })

    return Response.json(receipt)
  },
}
```

- 0.3.0
- chore: add node example (#11)
- feat: remove env argument from cloudflare workers connector and update example (#10)
- chore: update oxlint adn oxfmt settings
- Add Cloudflare Email Sending Adapter (#9)
- [codex] add smtp transport connectors (#8)
- feat: return html and text from render (#7)
- Update publish.yml to remove auth token
- Upgrade setup-node action from v4 to v5

## [0.2.0] - 2026-04-20

- 0.2.0
- feat: Enhance TypeScript development experience and linting rules (#5)
- refactor: improve type safety and DX across the codebase (#4)
- feat(css): add `hono/css` integration and `tailwind` option inside `<Markdown>` (#3)
- fix: ci syntax
- chore(ci): replace release-please with version-triggered release workflow
- chore(ci) add version changer
- chore: 0.1.1
- fix: tsconfig
- fix: build settings
- 0.1.0
- Update README to clarify library scope
- update README.md
- refactor: adopt oxlint/oxfmt and clean up validation
- chore(css): add warnings for several css propaties
- feat: unleash Node.js API
- feat(markdown) migrate to remark
- feat(lib): migrate to non-Node.js API libraries
- feat(tailwind) need tailwind plugin
- feat: unify render output API
- initial commit
