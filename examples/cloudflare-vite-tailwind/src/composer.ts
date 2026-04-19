import './composer.css'

type WelcomeComposerState = {
  closing: string
  ctaLabel: string
  ctaUrl: string
  footerNote: string
  headline: string
  intro: string
  preheader: string
  serviceName: string
  subject: string
  supportLabel: string
  supportUrl: string
  to: string
}

const defaultState: WelcomeComposerState = {
  closing: '準備ができたら、そのままダッシュボードから初期設定を完了してください。',
  ctaLabel: 'ダッシュボードを開く',
  ctaUrl: 'https://example.com/dashboard',
  footerNote: 'このメールはサンプルの Cloudflare Worker から送信されました。',
  headline: 'アカウントの準備が完了しました',
  intro: 'こんにちは、Taro さん。\n\n最初のセットアップは数分で終わります。まずはダッシュボードから現在の状況を確認してください。',
  preheader: 'セットアップを進めるための案内です。',
  serviceName: 'hono-email',
  subject: 'セットアップのご案内',
  supportLabel: 'サポートを見る',
  supportUrl: 'https://example.com/support',
  to: 'recipient@example.com',
}

const renderApp = (): string => `
  <div class="relative isolate min-h-screen overflow-hidden">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_36%)]"></div>
    <div class="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent)]"></div>
    <main class="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <header class="grid gap-4 rounded-[32px] border border-white/10 bg-white/6 p-6 backdrop-blur-xl lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] lg:items-end">
        <div class="space-y-4">
          <p class="text-xs font-medium uppercase tracking-[0.4em] text-paper/70">Cloudflare + Vite + Hono + Tailwind</p>
          <div class="space-y-3">
            <h1 class="max-w-4xl font-serif text-4xl leading-tight text-paper sm:text-5xl">
              送信前の文面をその場で組み立てて、そのまま preview と send まで通す。
            </h1>
            <p class="max-w-3xl text-sm leading-7 text-paper/72 sm:text-base">
              左で件名や本文を編集すると、右の email preview と plain text が即座に更新されます。
              そのまま同じ payload を Worker の送信 API に流すので、確認した内容で送れます。
            </p>
          </div>
        </div>
        <div class="grid gap-3 rounded-[28px] border border-white/10 bg-black/20 p-5 text-sm text-paper/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div class="flex items-center justify-between gap-3">
            <span class="uppercase tracking-[0.28em] text-paper/44">Routes</span>
            <a class="text-accent transition hover:text-accent-soft" href="/emails/welcome" target="_blank" rel="noreferrer">/emails/welcome</a>
          </div>
          <p>POST <code class="rounded bg-white/10 px-2 py-1 text-[13px]">/api/emails/welcome/preview</code></p>
          <p>POST <code class="rounded bg-white/10 px-2 py-1 text-[13px]">/api/emails/welcome/send</code></p>
        </div>
      </header>

      <section class="grid flex-1 gap-6 xl:grid-cols-[minmax(420px,520px)_minmax(0,1fr)]">
        <div class="rounded-[32px] border border-black/5 bg-panel p-5 text-ink shadow-panel sm:p-6">
          <div class="mb-6 flex items-center justify-between gap-4">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.32em] text-ink/45">Composer</p>
              <h2 class="mt-2 font-serif text-3xl">Welcome Email</h2>
            </div>
            <div class="rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-medium tracking-[0.24em] text-ink/50">
              tailwind page
            </div>
          </div>

          <form id="composer-form" class="space-y-6">
            <section class="grid gap-4">
              <div class="grid gap-4 md:grid-cols-2">
                <label class="grid gap-2">
                  <span class="text-sm font-medium text-ink/70">送信先</span>
                  <input name="to" class="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
                </label>
                <label class="grid gap-2">
                  <span class="text-sm font-medium text-ink/70">サービス名</span>
                  <input name="serviceName" class="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
                </label>
              </div>
              <label class="grid gap-2">
                <span class="text-sm font-medium text-ink/70">件名</span>
                <input name="subject" class="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </label>
              <label class="grid gap-2">
                <span class="text-sm font-medium text-ink/70">Preheader</span>
                <input name="preheader" class="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </label>
            </section>

            <section class="space-y-4 rounded-[28px] border border-black/6 bg-white p-4">
              <div>
                <p class="text-xs font-medium uppercase tracking-[0.32em] text-ink/45">Body</p>
                <h3 class="mt-2 font-serif text-2xl">本文</h3>
              </div>
              <label class="grid gap-2">
                <span class="text-sm font-medium text-ink/70">見出し</span>
                <input name="headline" class="rounded-2xl border border-line bg-paper px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </label>
              <label class="grid gap-2">
                <span class="text-sm font-medium text-ink/70">導入文</span>
                <textarea name="intro" rows="6" class="rounded-2xl border border-line bg-paper px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"></textarea>
              </label>
              <label class="grid gap-2">
                <span class="text-sm font-medium text-ink/70">締めの一文</span>
                <textarea name="closing" rows="3" class="rounded-2xl border border-line bg-paper px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"></textarea>
              </label>
            </section>

            <section class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2">
                <span class="text-sm font-medium text-ink/70">CTA ラベル</span>
                <input name="ctaLabel" class="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </label>
              <label class="grid gap-2">
                <span class="text-sm font-medium text-ink/70">CTA URL</span>
                <input name="ctaUrl" class="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </label>
              <label class="grid gap-2">
                <span class="text-sm font-medium text-ink/70">サポートラベル</span>
                <input name="supportLabel" class="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </label>
              <label class="grid gap-2">
                <span class="text-sm font-medium text-ink/70">サポート URL</span>
                <input name="supportUrl" class="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </label>
            </section>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-ink/70">フッターノート</span>
              <textarea name="footerNote" rows="3" class="rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"></textarea>
            </label>

            <div class="flex flex-wrap items-center gap-3 pt-2">
              <button id="send-button" type="submit" class="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition hover:bg-accent hover:text-ink">
                この内容で送信
              </button>
              <button id="reset-button" type="button" class="inline-flex items-center justify-center rounded-full border border-ink/12 px-6 py-3 text-sm font-medium text-ink transition hover:border-accent hover:text-accent">
                初期値に戻す
              </button>
              <p id="status" class="text-sm leading-6 text-ink/62">preview を生成しています...</p>
            </div>
          </form>
        </div>

        <div class="grid min-h-[780px] gap-6 xl:grid-rows-[minmax(0,1fr)_280px]">
          <section class="overflow-hidden rounded-[32px] border border-white/10 bg-white/6 p-4 backdrop-blur-xl">
            <div class="mb-4 flex items-center justify-between gap-3 px-2">
              <div>
                <p class="text-xs font-medium uppercase tracking-[0.32em] text-paper/52">HTML Preview</p>
                <h2 class="mt-2 font-serif text-3xl text-paper">配信される HTML</h2>
              </div>
              <a id="open-preview" class="rounded-full border border-white/12 px-4 py-2 text-sm text-paper transition hover:border-accent hover:text-accent" href="/emails/welcome" target="_blank" rel="noreferrer">
                別タブで開く
              </a>
            </div>
            <iframe id="preview-frame" title="welcome email preview" class="h-[min(74vh,900px)] w-full rounded-[28px] border border-black/10 bg-white"></iframe>
          </section>

          <section class="rounded-[32px] border border-white/10 bg-black/28 p-4 text-paper backdrop-blur-xl">
            <div class="mb-4 px-2">
              <p class="text-xs font-medium uppercase tracking-[0.32em] text-paper/52">Plain Text</p>
              <h2 class="mt-2 font-serif text-3xl">テキスト版</h2>
            </div>
            <pre id="plain-text" class="h-[210px] overflow-auto rounded-[24px] border border-white/8 bg-black/32 p-4 text-sm leading-7 text-paper/82"></pre>
          </section>
        </div>
      </section>
    </main>
  </div>
`

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('#app not found')
}

app.innerHTML = renderApp()

const form = document.querySelector<HTMLFormElement>('#composer-form')
const previewFrame = document.querySelector<HTMLIFrameElement>('#preview-frame')
const plainText = document.querySelector<HTMLElement>('#plain-text')
const status = document.querySelector<HTMLElement>('#status')
const openPreview = document.querySelector<HTMLAnchorElement>('#open-preview')
const resetButton = document.querySelector<HTMLButtonElement>('#reset-button')
const sendButton = document.querySelector<HTMLButtonElement>('#send-button')

if (!form || !previewFrame || !plainText || !status || !openPreview || !resetButton || !sendButton) {
  throw new Error('composer UI is incomplete')
}

const setStatus = (message: string, tone: 'default' | 'error' | 'success' = 'default'): void => {
  status.textContent = message
  status.className =
    tone === 'error'
      ? 'text-sm leading-6 text-red-700'
      : tone === 'success'
        ? 'text-sm leading-6 text-emerald-700'
        : 'text-sm leading-6 text-ink/62'
}

const formDataToState = (): WelcomeComposerState => {
  const data = new FormData(form)

  return {
    closing: String(data.get('closing') ?? ''),
    ctaLabel: String(data.get('ctaLabel') ?? ''),
    ctaUrl: String(data.get('ctaUrl') ?? ''),
    footerNote: String(data.get('footerNote') ?? ''),
    headline: String(data.get('headline') ?? ''),
    intro: String(data.get('intro') ?? ''),
    preheader: String(data.get('preheader') ?? ''),
    serviceName: String(data.get('serviceName') ?? ''),
    subject: String(data.get('subject') ?? ''),
    supportLabel: String(data.get('supportLabel') ?? ''),
    supportUrl: String(data.get('supportUrl') ?? ''),
    to: String(data.get('to') ?? ''),
  }
}

const applyState = (state: WelcomeComposerState): void => {
  for (const [name, value] of Object.entries(state)) {
    const field = form.elements.namedItem(name)

    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      field.value = value
    }
  }
}

const toPreviewHref = (state: WelcomeComposerState): string => {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(state)) {
    if (key === 'to') {
      continue
    }

    params.set(key, value)
  }

  return `/emails/welcome?${params.toString()}`
}

const refreshPreview = async (): Promise<void> => {
  const state = formDataToState()

  openPreview.href = toPreviewHref(state)
  setStatus('preview を生成しています...')

  try {
    const response = await fetch('/api/emails/welcome/preview', {
      body: JSON.stringify(state),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    const data = (await response.json()) as { html?: string; ok?: boolean; text?: string; error?: string }

    if (!response.ok || !data.ok || !data.html || !data.text) {
      throw new Error(data.error ?? 'preview の生成に失敗しました。')
    }

    previewFrame.srcdoc = data.html
    plainText.textContent = data.text
    setStatus('preview を更新しました。')
  } catch (error) {
    previewFrame.srcdoc = ''
    plainText.textContent = ''
    setStatus(error instanceof Error ? error.message : 'preview の生成に失敗しました。', 'error')
  }
}

let previewTimer: number | undefined

form.addEventListener('input', () => {
  window.clearTimeout(previewTimer)
  previewTimer = window.setTimeout(() => {
    void refreshPreview()
  }, 180)
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const payload = formDataToState()

  sendButton.disabled = true
  sendButton.classList.add('opacity-60', 'cursor-not-allowed')
  setStatus('送信処理を実行しています...')

  try {
    const response = await fetch('/api/emails/welcome/send', {
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    const data = (await response.json()) as { ok?: boolean; messageId?: string | null; error?: string }

    if (!response.ok || !data.ok) {
      throw new Error(data.error ?? '送信に失敗しました。')
    }

    setStatus(`送信しました。messageId: ${data.messageId ?? 'n/a'}`, 'success')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : '送信に失敗しました。', 'error')
  } finally {
    sendButton.disabled = false
    sendButton.classList.remove('opacity-60', 'cursor-not-allowed')
  }
})

resetButton.addEventListener('click', () => {
  applyState(defaultState)
  void refreshPreview()
})

applyState(defaultState)
void refreshPreview()
