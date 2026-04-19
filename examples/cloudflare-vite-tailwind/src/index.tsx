import { Hono } from 'hono'

import {
  createWelcomeEmailInput,
  renderWelcomeEmail,
  renderWelcomeEmailText,
  type WelcomeEmailInput,
  type WelcomeEmailOverrides,
} from './emails/welcome'

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

type WelcomeSendRequest = WelcomeEmailOverrides & {
  to?: string | string[]
}

const app = new Hono<AppEnv>()

const toWelcomeEmailInput = (overrides: WelcomeEmailOverrides = {}): WelcomeEmailInput => createWelcomeEmailInput(overrides)

app.get('/emails/welcome', async (c) => {
  const email = toWelcomeEmailInput({
    closing: c.req.query('closing'),
    ctaLabel: c.req.query('ctaLabel'),
    ctaUrl: c.req.query('ctaUrl'),
    footerNote: c.req.query('footerNote'),
    headline: c.req.query('headline'),
    intro: c.req.query('intro'),
    preheader: c.req.query('preheader'),
    serviceName: c.req.query('serviceName'),
    subject: c.req.query('subject'),
    supportLabel: c.req.query('supportLabel'),
    supportUrl: c.req.query('supportUrl'),
  })

  return c.html(await renderWelcomeEmail(email))
})

app.post('/api/emails/welcome/preview', async (c) => {
  const payload = await c.req.json<WelcomeSendRequest>()
  const email = toWelcomeEmailInput(payload)
  const [html, text] = await Promise.all([renderWelcomeEmail(email), renderWelcomeEmailText(email)])

  return c.json({
    html,
    input: email,
    ok: true,
    text,
  })
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

  const payload = await c.req.json<WelcomeSendRequest>()
  const email = toWelcomeEmailInput(payload)
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

  const [html, text] = await Promise.all([renderWelcomeEmail(email), renderWelcomeEmailText(email)])
  const result = await c.env.EMAIL.send({
    from: c.env.EMAIL_FROM,
    html,
    subject: email.subject,
    text,
    to,
  })

  return c.json({
    messageId: result?.messageId ?? null,
    ok: true,
  })
})

export default app
