import { describe, expect, test } from 'bun:test'

import type { Child } from 'hono/jsx'

import {
  Conditional,
  Tailwind,
  buildTailwindArtifactFromCss,
  sendEmail as sendEmailFromCore,
} from '../index'
import { sendEmail, type EmailAdapter, type EmailMessage } from './index'

describe.each([
  ['hono-email', sendEmailFromCore],
  ['hono-email/adapter', sendEmail],
] as const)('sendEmail from %s', (_entry, send) => {
  const error = new Error('Draft render failed')
  const Broken = (): never => {
    throw error
  }
  const AsyncBroken = async (): Promise<never> => {
    await Promise.resolve()
    throw error
  }
  const artifact = buildTailwindArtifactFromCss({ css: '.known { color: #123456; }' })
  const failedDrafts: [string, () => Child, string][] = [
    ['synchronous failure', () => <Broken />, 'Draft render failed'],
    ['asynchronous failure', () => <AsyncBroken />, 'Draft render failed'],
    [
      'Conditional failure',
      () => (
        <Conditional>
          <AsyncBroken />
        </Conditional>
      ),
      'Draft render failed',
    ],
    [
      'missing Tailwind class',
      () => (
        <Tailwind artifact={artifact}>
          <p className="missing">Draft</p>
        </Tailwind>
      ),
      "Tailwind class 'missing' is missing from the build artifact.",
    ],
  ]

  test.each(failedDrafts)('rejects %s without sending', async (_name, createDraft, message) => {
    const sent: EmailMessage[] = []
    const adapter: EmailAdapter = {
      async send(email) {
        sent.push(email)
        return {
          successful: true,
          messageId: 'local-draft',
          response: 'Sent locally',
          accepted: ['recipient@example.com'],
          rejected: [],
        }
      },
    }

    await expect(
      send({
        adapter,
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Draft',
        jsx: createDraft(),
      }),
    ).rejects.toThrow(message)
    expect(sent).toEqual([])
  })
})
