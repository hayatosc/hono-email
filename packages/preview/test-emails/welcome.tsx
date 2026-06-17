import { Html, Body, Container, Head, Heading, Preview, Tailwind, Text, Button, Section, Hr, Column, Link } from 'hono-email'

import type { PreviewPropsConfig } from '../src/props/index.js'

export const previewProps = {
  name: { type: 'string', default: 'Taro' },
  appName: { type: 'string', default: 'Acme' },
  trialDays: { type: 'number', default: 14 }
} satisfies PreviewPropsConfig

type Props = {
  name?: string
  appName?: string
  trialDays?: number
}

const steps = [
  {
    title: 'Complete your profile',
    description: 'Add a photo and a few details so your teammates can recognize you.'
  },
  {
    title: 'Invite your team',
    description: 'Collaboration is better together. Bring in the people you work with.'
  },
  {
    title: 'Create your first project',
    description: 'Start from a template or a blank canvas — whatever fits your workflow.'
  }
]

export default function WelcomeEmail({ name = 'Hayato', appName = 'Acme', trialDays = 14 }: Props) {
  return (
    <Html>
      <Head>
        <title>Welcome to {appName}</title>
      </Head>
      <Preview>You have {trialDays} days of full access — here's how to get the most out of {appName}.</Preview>
      <Tailwind>
        <Body className="bg-slate-100 py-10 px-4 font-sans text-slate-700">
          <Container className="mx-auto w-full max-w-[600px]">
            {/* Logo header */}
            <Section>
              <Column className="px-2 py-6 align-middle">
                <span className="inline-block h-8 w-8 rounded-lg bg-indigo-600 text-center text-lg font-bold leading-8 text-white">
                  {appName.charAt(0)}
                </span>
                <span className="ml-3 align-middle text-lg font-semibold tracking-tight text-slate-900">{appName}</span>
              </Column>
              <Column className="px-2 py-6 text-right align-middle">
                <Link href="https://example.com/app" className="text-sm font-medium text-indigo-600 no-underline">
                  Open app →
                </Link>
              </Column>
            </Section>

            {/* Card */}
            <Container className="rounded-2xl border border-slate-200 bg-white">
              {/* Hero */}
              <Section>
                <Column className="px-10 pt-10">
                  <Heading className="m-0 text-2xl font-bold tracking-tight text-slate-900">
                    Welcome aboard, {name} 👋
                  </Heading>
                  <Text className="mt-4 mb-0 text-base leading-relaxed text-slate-600">
                    We're glad you're here. Your account is ready and you've unlocked a{' '}
                    <strong className="text-slate-900">{trialDays}-day free trial</strong> with full access to every feature — no credit card required.
                  </Text>
                </Column>
              </Section>
              <Section>
                <Column className="px-10 pt-7 pb-10">
                  <Button
                    href="https://example.com/onboarding"
                    className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white no-underline"
                  >
                    Get started
                  </Button>
                </Column>
              </Section>

              <Hr className="m-0 border-t border-slate-100" />

              {/* Onboarding steps */}
              <Section>
                <Column className="px-10 py-8">
                  <Text className="m-0 mb-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Get started in 3 steps
                  </Text>
                  {steps.map((step, i) => (
                    <Section key={i}>
                      <Column className="w-9 pb-5 align-top">
                        <span className="inline-block h-7 w-7 rounded-full bg-indigo-50 text-center text-sm font-semibold leading-7 text-indigo-600">
                          {i + 1}
                        </span>
                      </Column>
                      <Column className="pb-5 pl-2 align-top">
                        <Text className="m-0 text-sm font-semibold text-slate-900">{step.title}</Text>
                        <Text className="mt-1 mb-0 text-sm leading-relaxed text-slate-500">{step.description}</Text>
                      </Column>
                    </Section>
                  ))}
                </Column>
              </Section>

              <Hr className="m-0 border-t border-slate-100" />

              {/* Help */}
              <Section>
                <Column className="px-10 py-7">
                  <Text className="m-0 text-sm leading-relaxed text-slate-500">
                    Questions? Just reply to this email — a real person on our team will help you out. You can also browse our{' '}
                    <Link href="https://example.com/docs" className="font-medium text-indigo-600 underline">
                      help center
                    </Link>
                    .
                  </Text>
                </Column>
              </Section>
            </Container>

            {/* Footer */}
            <Section>
              <Column className="px-6 py-8 text-center">
                <Text className="m-0 text-xs leading-relaxed text-slate-400">
                  {appName}, Inc. · 123 Market Street, Suite 400 · San Francisco, CA 94103
                </Text>
                <Text className="mt-3 mb-0 text-xs text-slate-400">
                  <Link href="https://example.com/settings" className="text-slate-400 underline">
                    Email preferences
                  </Link>
                  {'  ·  '}
                  <Link href="https://example.com/unsubscribe" className="text-slate-400 underline">
                    Unsubscribe
                  </Link>
                  {'  ·  '}
                  <Link href="https://example.com/privacy" className="text-slate-400 underline">
                    Privacy
                  </Link>
                </Text>
                <Text className="mt-3 mb-0 text-xs text-slate-300">© 2026 {appName}, Inc. All rights reserved.</Text>
              </Column>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
