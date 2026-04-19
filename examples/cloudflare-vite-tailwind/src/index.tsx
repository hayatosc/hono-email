import { Hono } from 'hono'

import { renderWelcomeEmail, type WelcomeEmailInput } from './emails/welcome'

type EmailSendRequest = {
  from: string
  html: string
  subject: string
  text: string
  to: string | string[]
}

type EmailSendResult = {
  messageId: string
}

type SendEmailBinding = {
  send(message: EmailSendRequest): Promise<EmailSendResult>
}

type Bindings = {
  EMAIL?: SendEmailBinding
  EMAIL_FROM?: string
}

type AppEnv = {
  Bindings: Bindings
}

type SendWelcomeRequest = {
  dashboardUrl?: string
  supportUrl?: string
  to?: string | string[]
  userName?: string
}

const app = new Hono<AppEnv>()

const defaultWelcomeEmailInput = (overrides: SendWelcomeRequest = {}): WelcomeEmailInput => ({
  dashboardUrl: overrides.dashboardUrl ?? 'https://example.com/dashboard',
  supportUrl: overrides.supportUrl ?? 'https://example.com/support',
  userName: overrides.userName ?? 'Taro',
})

const renderIndexPage = (origin: string): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>hono-email Cloudflare Example</title>
    <style>
      :root {
        color-scheme: light;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        background: #f8fafc;
        color: #0f172a;
      }
      main {
        max-width: 760px;
        margin: 0 auto;
        padding: 40px 20px 72px;
      }
      .card {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
      }
      code,
      pre {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      pre {
        background: #0f172a;
        color: #f8fafc;
        border-radius: 12px;
        padding: 16px;
        overflow: auto;
      }
      a {
        color: #0f172a;
      }
      ul {
        padding-left: 20px;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <p>Cloudflare + Vite + Hono + Tailwind</p>
        <h1>hono-email runnable example</h1>
        <p>
          This Worker renders an email preview at request time and uses <code>hono-email/vite</code> to inject the
          Tailwind artifact at build time.
        </p>
        <ul>
          <li><a href="${origin}/emails/welcome">GET /emails/welcome</a> renders the email HTML.</li>
          <li><code>POST /api/emails/welcome/send</code> sends the email when an <code>EMAIL</code> binding exists.</li>
        </ul>
        <pre>curl -X POST "${origin}/api/emails/welcome/send" \\
  -H "content-type: application/json" \\
  -d '{"userName":"Taro","dashboardUrl":"https://example.com/app","to":"recipient@example.com"}'</pre>
      </div>
    </main>
  </body>
</html>`

const createPlainText = ({ dashboardUrl, supportUrl, userName }: WelcomeEmailInput): string =>
  [
    `Welcome, ${userName}`,
    '',
    'Your account is ready. Continue from your dashboard and finish the initial setup.',
    '',
    `Dashboard: ${dashboardUrl}`,
    `Support: ${supportUrl}`,
  ].join('\n')

app.get('/', (c) => c.html(renderIndexPage(new URL(c.req.url).origin)))

app.get('/emails/welcome', async (c) => {
  const email = defaultWelcomeEmailInput({
    dashboardUrl: c.req.query('dashboard'),
    supportUrl: c.req.query('support'),
    userName: c.req.query('user'),
  })

  return c.html(await renderWelcomeEmail(email))
})

app.post('/api/emails/welcome/send', async (c) => {
  if (!c.env.EMAIL || !c.env.EMAIL_FROM) {
    return c.json(
      {
        error:
          'EMAIL binding or EMAIL_FROM is missing. Update examples/cloudflare-vite-tailwind/wrangler.jsonc before calling this route.',
        ok: false,
      },
      501
    )
  }

  const payload = await c.req.json<SendWelcomeRequest>()
  const email = defaultWelcomeEmailInput(payload)
  const to = payload.to

  if (!to) {
    return c.json(
      {
        error: '`to` is required in the request body when sending email.',
        ok: false,
      },
      400
    )
  }

  const html = await renderWelcomeEmail(email)
  const result = await c.env.EMAIL.send({
    from: c.env.EMAIL_FROM,
    html,
    subject: 'Welcome to hono-email',
    text: createPlainText(email),
    to,
  })

  return c.json({
    messageId: result.messageId,
    ok: true,
  })
})

export default app
