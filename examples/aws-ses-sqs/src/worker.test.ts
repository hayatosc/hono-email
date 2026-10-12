import { describe, expect, test } from 'bun:test'

import type { SQSEvent, SQSRecord } from 'aws-lambda'
import type { EmailAdapter, EmailMessage } from 'hono-email/aws-ses'

import { processEmailBatch } from './worker'

const record = (id: string, body: string, fifo = false): SQSRecord => ({
  messageId: id,
  body,
  receiptHandle: 'handle',
  attributes: {
    ApproximateReceiveCount: '1',
    SentTimestamp: '0',
    SenderId: 'sender',
    ApproximateFirstReceiveTimestamp: '0',
  },
  messageAttributes: {},
  md5OfBody: 'unused',
  eventSource: 'aws:sqs',
  eventSourceARN: `arn:aws:sqs:ap-northeast-1:123456789012:emails${fifo ? '.fifo' : ''}`,
  awsRegion: 'ap-northeast-1',
})
const job = (name: string): string => JSON.stringify({ to: 'recipient@example.com', name })

describe('SQS email worker', () => {
  test('returns only failed record IDs for receipt, parsing, validation, and thrown failures', async () => {
    const messages: EmailMessage[] = []
    const adapter: EmailAdapter = {
      async send(message) {
        messages.push(message)
        if (message.text.includes('reject'))
          return {
            successful: false,
            accepted: [],
            rejected: ['recipient@example.com'],
            errorMessages: ['Throttled'],
          }
        if (message.text.includes('throw')) throw new Error('Unavailable')
        return {
          successful: true,
          accepted: ['recipient@example.com'],
          rejected: [],
          messageId: 'ses-id',
          response: 'Accepted',
        }
      },
    }
    const event: SQSEvent = {
      Records: [
        record('ok', job('Alice')),
        record('receipt-failure', job('reject')),
        record('bad-json', '{'),
        record('invalid-job', '{"to":42,"name":"Alice"}'),
        record('exception', job('throw')),
        record('ok-after-failure', job('<script>alert(1)</script>')),
      ],
    }
    expect(await processEmailBatch(event, adapter, 'sender@example.com')).toEqual({
      batchItemFailures: [
        { itemIdentifier: 'receipt-failure' },
        { itemIdentifier: 'bad-json' },
        { itemIdentifier: 'invalid-job' },
        { itemIdentifier: 'exception' },
      ],
    })
    expect(messages).toHaveLength(4)
    expect(messages[3]?.html).toContain('&lt;script&gt;')
    expect(messages[3]?.html).not.toContain('<script>')
  })

  test('stops after a FIFO failure and returns unprocessed IDs for retry', async () => {
    let sends = 0
    const adapter: EmailAdapter = {
      async send() {
        sends++
        return { successful: false, accepted: [], rejected: [], errorMessages: ['Failed'] }
      },
    }
    const event: SQSEvent = {
      Records: [record('failed', job('Alice'), true), record('unprocessed', job('Bob'), true)],
    }
    expect(await processEmailBatch(event, adapter, 'sender@example.com')).toEqual({
      batchItemFailures: [{ itemIdentifier: 'failed' }, { itemIdentifier: 'unprocessed' }],
    })
    expect(sends).toBe(1)
  })

  test('returns an empty failure list for an empty batch', async () => {
    const adapter: EmailAdapter = {
      async send() {
        throw new Error('Unexpected send')
      },
    }
    expect(await processEmailBatch({ Records: [] }, adapter, 'sender@example.com')).toEqual({
      batchItemFailures: [],
    })
  })
})
