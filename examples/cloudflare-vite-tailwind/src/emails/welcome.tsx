import { Body, Container, Head, Heading, Html, Preview, Tailwind, Text } from 'hono-email'

export type WelcomeEmailInput = {
  message: string
  subject: string
}

export type WelcomeEmailOverrides = Partial<WelcomeEmailInput>

export const defaultWelcomeEmailInput = (): WelcomeEmailInput => ({
  message: 'Hello,\n\nThis email was sent from the Hono form in examples/cloudflare-vite-tailwind.',
  subject: 'Test email from hono-email',
})

const mergeField = (value: string | undefined, fallback: string): string => {
  const normalized = value?.trim()

  return normalized && normalized.length > 0 ? normalized : fallback
}

export const createWelcomeEmailInput = (
  overrides: WelcomeEmailOverrides = {},
): WelcomeEmailInput => {
  const defaults = defaultWelcomeEmailInput()

  return {
    message: mergeField(overrides.message, defaults.message),
    subject: mergeField(overrides.subject, defaults.subject),
  }
}

const toParagraphs = (value: string): string[] =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)

export const WelcomeEmail = ({ message, subject }: WelcomeEmailInput) => (
  <Html lang="en">
    <Head>
      <title>{subject}</title>
    </Head>
    <Preview>{subject}</Preview>
    <Tailwind>
      <Body className="bg-stone-100 py-8">
        <Container className="px-4">
          <Container className="mx-auto max-w-xl overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_22px_80px_rgba(28,25,23,0.08)]">
            <Container className="border-b border-stone-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,127,50,0.18),_transparent_36%),linear-gradient(135deg,#fff7ee_0%,#f8f4ee_100%)] px-8 py-7">
              <Text className="mb-3 text-[12px] uppercase tracking-[0.32em] text-stone-500">
                hono-email
              </Text>
              <Heading
                as="h1"
                className="m-0 text-[30px] leading-[38px] font-semibold text-stone-950"
              >
                {subject}
              </Heading>
            </Container>

            <Container className="px-8 py-8">
              {toParagraphs(message).map((paragraph) => (
                <Text className="my-0 mb-4 text-[15px] leading-7 text-stone-700">{paragraph}</Text>
              ))}
            </Container>
          </Container>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)
