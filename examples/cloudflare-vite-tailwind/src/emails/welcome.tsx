import { Body, Button, Container, Head, Heading, Html, Preview, Tailwind, Text, render } from 'hono-email'

export type WelcomeEmailInput = {
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
}

export type WelcomeEmailOverrides = Partial<WelcomeEmailInput>

export const defaultWelcomeEmailInput = (): WelcomeEmailInput => ({
  closing: '準備ができたら、そのままダッシュボードから初期設定を完了してください。',
  ctaLabel: 'ダッシュボードを開く',
  ctaUrl: 'https://example.com/dashboard',
  footerNote: 'このメールはサンプルの Cloudflare Worker から送信されました。',
  headline: 'アカウントの準備が完了しました',
  intro:
    'こんにちは、Taro さん。\n\n最初のセットアップは数分で終わります。まずはダッシュボードから現在の状況を確認してください。',
  preheader: 'セットアップを進めるための案内です。',
  serviceName: 'hono-email',
  subject: 'セットアップのご案内',
  supportLabel: 'サポートを見る',
  supportUrl: 'https://example.com/support',
})

const mergeField = (value: string | undefined, fallback: string): string => {
  const normalized = value?.trim()

  return normalized && normalized.length > 0 ? normalized : fallback
}

export const createWelcomeEmailInput = (overrides: WelcomeEmailOverrides = {}): WelcomeEmailInput => {
  const defaults = defaultWelcomeEmailInput()

  return {
    closing: mergeField(overrides.closing, defaults.closing),
    ctaLabel: mergeField(overrides.ctaLabel, defaults.ctaLabel),
    ctaUrl: mergeField(overrides.ctaUrl, defaults.ctaUrl),
    footerNote: mergeField(overrides.footerNote, defaults.footerNote),
    headline: mergeField(overrides.headline, defaults.headline),
    intro: mergeField(overrides.intro, defaults.intro),
    preheader: mergeField(overrides.preheader, defaults.preheader),
    serviceName: mergeField(overrides.serviceName, defaults.serviceName),
    subject: mergeField(overrides.subject, defaults.subject),
    supportLabel: mergeField(overrides.supportLabel, defaults.supportLabel),
    supportUrl: mergeField(overrides.supportUrl, defaults.supportUrl),
  }
}

const toParagraphs = (value: string): string[] =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)

const WelcomeEmail = ({
  closing,
  ctaLabel,
  ctaUrl,
  footerNote,
  headline,
  intro,
  preheader,
  serviceName,
  subject,
  supportLabel,
  supportUrl,
}: WelcomeEmailInput) => (
  <Html lang='ja'>
    <Head>
      <title>{subject}</title>
    </Head>
    <Preview>{preheader}</Preview>
    <Tailwind>
      <Body className='bg-stone-100 py-8'>
        <Container className='px-4'>
          <Container className='mx-auto max-w-xl overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_22px_80px_rgba(28,25,23,0.08)]'>
            <Container className='border-b border-stone-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,122,0,0.18),_transparent_36%),linear-gradient(135deg,#fff8ee_0%,#f8f5f0_100%)] px-8 py-7'>
              <Text className='mb-3 text-[12px] uppercase tracking-[0.32em] text-stone-500'>{serviceName}</Text>
              <Heading as='h1' className='m-0 text-[30px] leading-[38px] font-semibold text-stone-950'>
                {headline}
              </Heading>
            </Container>

            <Container className='px-8 py-8'>
              {toParagraphs(intro).map((paragraph) => (
                <Text className='my-0 mb-4 text-[15px] leading-7 text-stone-700'>{paragraph}</Text>
              ))}

              <Container className='my-8'>
                <Button
                  href={ctaUrl}
                  className='inline-block rounded-full bg-stone-950 px-6 py-3 text-[14px] font-medium text-white'
                >
                  {ctaLabel}
                </Button>
              </Container>

              {toParagraphs(closing).map((paragraph) => (
                <Text className='my-0 mb-4 text-[15px] leading-7 text-stone-700'>{paragraph}</Text>
              ))}

              <Text className='my-0 mb-4 text-[14px] leading-7 text-stone-500'>
                <a href={supportUrl}>{supportLabel}</a>
              </Text>

              <Text className='my-0 text-[13px] leading-6 text-stone-400'>{footerNote}</Text>
            </Container>
          </Container>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

export const renderWelcomeEmail = (input: WelcomeEmailInput): Promise<string> => render(<WelcomeEmail {...input} />)

export const renderWelcomeEmailText = (input: WelcomeEmailInput): Promise<string> =>
  render(<WelcomeEmail {...input} />, {
    output: 'text',
  })
