import { Hono } from 'hono'

import {
  createWelcomeEmailInput,
  defaultWelcomeEmailInput,
  renderWelcomeEmail,
  renderWelcomeEmailText,
  type WelcomeEmailOverrides,
} from './emails/welcome'

type Recipient = string | string[]

type EmailAddress = {
  email: string
  name?: string
}

type SendEmailRequest = {
  from: string | EmailAddress
  html: string
  subject: string
  text: string
  to: Recipient
}

type SendEmailResult = {
  messageId?: string
}

type SendEmailBinding = {
  send(message: SendEmailRequest): Promise<SendEmailResult>
}

type Bindings = {
  EMAIL?: SendEmailBinding
  EMAIL_FROM?: string
  EMAIL_FROM_NAME?: string
}

type AppEnv = {
  Bindings: Bindings
}

type WelcomeFormState = WelcomeEmailOverrides & {
  to: string
}

type ComposerPageData = {
  form: WelcomeFormState
  status?: {
    message: string
    tone: 'default' | 'error' | 'success'
  }
}

const app = new Hono<AppEnv>()

const splitRecipients = (value: string | undefined): string[] =>
  (value ?? '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

const toRecipient = (value: string | undefined): Recipient | null => {
  const recipients = splitRecipients(value)
  const first = recipients[0]

  if (recipients.length === 0 || first === undefined) {
    return null
  }

  return recipients.length === 1 ? first : recipients
}

const toFromAddress = (email: string, name: string | undefined): string | EmailAddress =>
  name && name.trim().length > 0 ? { email, name: name.trim() } : email

const toWelcomeFormState = (overrides: Partial<WelcomeFormState> = {}): WelcomeFormState => {
  const defaults = defaultWelcomeEmailInput()

  return {
    message: overrides.message ?? defaults.message,
    subject: overrides.subject ?? defaults.subject,
    to: overrides.to ?? 'recipient@example.com',
  }
}

const formDataString = (formData: FormData, key: string): string => {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

const formDataToWelcomeFormState = (formData: FormData): WelcomeFormState =>
  toWelcomeFormState({
    message: formDataString(formData, 'message'),
    subject: formDataString(formData, 'subject'),
    to: formDataString(formData, 'to'),
  })

const renderComposerPage = ({ form, status }: ComposerPageData) => {
  const statusClass =
    status?.tone === 'error'
      ? 'text-sm leading-6 font-medium text-red-700'
      : status?.tone === 'success'
        ? 'text-sm leading-6 font-medium text-emerald-700'
        : 'text-sm leading-6 text-stone-600'

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>hono-email Send Form</title>
        <link rel="stylesheet" href="/src/style.css" />
      </head>
      <body class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,127,50,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_26%),linear-gradient(180deg,#2e241f_0%,#17191d_54%,#0f1115_100%)] font-[Avenir_Next,Hiragino_Sans,Yu_Gothic,sans-serif] text-stone-50">
        <main class="mx-auto w-[min(720px,calc(100vw-32px))] py-6 pb-10">
          <section class="rounded-[32px] border border-white/10 bg-white/6 p-6 backdrop-blur-[20px]">
            <div class="space-y-3">
              <p class="m-0 text-[12px] uppercase tracking-[0.4em] text-stone-200/70">
                Cloudflare + Vite + Hono + Tailwind
              </p>
              <h1 class="m-0 text-[clamp(2rem,4vw,2.8rem)] leading-[1.15] font-[Iowan_Old_Style,Palatino_Linotype,Hiragino_Mincho_ProN,serif]">
                Minimal send form
              </h1>
              <p class="m-0 leading-8 text-stone-200/70">
                Send an email through Cloudflare Email Service directly from a Hono JSX form.
              </p>
            </div>
          </section>

          <section class="mt-6 rounded-[32px] border border-white/10 bg-[rgba(255,249,243,0.94)] p-6 text-stone-900 shadow-[0_28px_90px_rgba(10,12,16,0.18)]">
            <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div class="space-y-2">
                <p class="m-0 text-[12px] uppercase tracking-[0.4em] text-stone-500">Send</p>
                <h2 class="m-0 font-[Iowan_Old_Style,Palatino_Linotype,Hiragino_Mincho_ProN,serif] text-3xl leading-tight">
                  Email Form
                </h2>
              </div>
              <div class="rounded-full border border-stone-900/10 bg-white px-3 py-1.5 text-[12px] uppercase tracking-[0.24em] text-stone-600">
                server rendered
              </div>
            </div>

            <form class="grid gap-5" method="post" action="/send">
              <div class="grid gap-2">
                <label class="text-sm font-semibold text-stone-700" htmlFor="to">
                  To
                </label>
                <input
                  class="w-full rounded-[18px] border border-stone-900/12 bg-white px-4 py-3.5 text-stone-900 outline-none transition focus:border-stone-900/30 focus:ring-4 focus:ring-orange-200/60"
                  id="to"
                  name="to"
                  value={form.to}
                />
                <p class="m-0 text-sm leading-7 text-stone-500">
                  Use commas to send to multiple recipients.
                </p>
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-semibold text-stone-700" htmlFor="subject">
                  Subject
                </label>
                <input
                  class="w-full rounded-[18px] border border-stone-900/12 bg-white px-4 py-3.5 text-stone-900 outline-none transition focus:border-stone-900/30 focus:ring-4 focus:ring-orange-200/60"
                  id="subject"
                  name="subject"
                  value={form.subject}
                />
              </div>

              <div class="grid gap-4">
                <label class="text-sm font-semibold text-stone-700" htmlFor="message">
                  Message
                </label>
                <textarea id="message" name="message" rows={10}>
                  {form.message}
                </textarea>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <button
                  class="inline-flex min-h-12 items-center justify-center rounded-full bg-stone-900 px-5 text-sm font-semibold text-stone-50 transition hover:bg-stone-800"
                  type="submit"
                >
                  Send email
                </button>
                <a
                  class="inline-flex min-h-12 items-center justify-center rounded-full border border-stone-900/10 bg-white px-5 text-sm font-semibold text-stone-900 transition hover:bg-stone-50"
                  href="/"
                >
                  Reset
                </a>
                <span class={statusClass}>
                  {status?.message ?? 'Set EMAIL_FROM and the EMAIL binding, then submit the form.'}
                </span>
              </div>
            </form>
          </section>
        </main>
      </body>
    </html>
  )
}

app.get('/', async (c) => c.html(renderComposerPage({ form: toWelcomeFormState() })))

app.post('/send', async (c) => {
  const form = formDataToWelcomeFormState(await c.req.formData())

  if (!c.env.EMAIL || !c.env.EMAIL_FROM) {
    return c.html(
      renderComposerPage({
        form,
        status: {
          message:
            'EMAIL binding or EMAIL_FROM is missing. Update examples/cloudflare-vite-tailwind/wrangler.jsonc.',
          tone: 'error',
        },
      }),
      501,
    )
  }

  const to = toRecipient(form.to)

  if (!to) {
    return c.html(
      renderComposerPage({
        form,
        status: {
          message: '`to` is required. You can pass multiple recipients separated by commas.',
          tone: 'error',
        },
      }),
      400,
    )
  }

  const email = createWelcomeEmailInput(form)
  const [html, text] = await Promise.all([renderWelcomeEmail(email), renderWelcomeEmailText(email)])
  await c.env.EMAIL.send({
    from: toFromAddress(c.env.EMAIL_FROM, c.env.EMAIL_FROM_NAME),
    html,
    subject: email.subject,
    text,
    to,
  })

  return c.html(
    renderComposerPage({
      form,
      status: {
        message: `Sent successfully.`,
        tone: 'success',
      },
    }),
  )
})

export default app
