# Changelog

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
import { CloudflareEmailAdapter } from 'hono-email/cloudflare-email'
import WorkersConnector from 'hono-email/cloudflare-email/cloudflare'

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
