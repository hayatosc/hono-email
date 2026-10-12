import type { SQSBatchResponse, SQSEvent } from 'aws-lambda'
import { Body, Html, Text } from 'hono-email'
import { sendEmail } from 'hono-email/aws-ses'
import type { EmailAdapter } from 'hono-email/aws-ses'

type WelcomeJob = { to: string; name: string }

const parseJob = (body: string): WelcomeJob => {
  const value: unknown = JSON.parse(body)
  if (
    typeof value !== 'object' ||
    value === null ||
    !('to' in value) ||
    typeof value.to !== 'string' ||
    value.to.length === 0 ||
    !('name' in value) ||
    typeof value.name !== 'string'
  ) {
    throw new Error('Expected a welcome job with to and name strings.')
  }
  return { to: value.to, name: value.name }
}

export const processEmailBatch = async (
  event: SQSEvent,
  adapter: EmailAdapter,
  from: string,
): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = []
  let stopAfterFailure = false

  for (const record of event.Records) {
    if (stopAfterFailure) {
      batchItemFailures.push({ itemIdentifier: record.messageId })
      continue
    }
    try {
      const job = parseJob(record.body)
      const receipt = await sendEmail({
        adapter,
        from,
        to: job.to,
        subject: 'Welcome!',
        jsx: (
          <Html>
            <Body>
              <Text>Hello {job.name}, welcome aboard!</Text>
            </Body>
          </Html>
        ),
      })
      // Delivery failures are receipts; rendering and parsing failures throw.
      if (!receipt.successful) throw new Error('SES did not accept the email.')
    } catch {
      console.error('Email job failed', { messageId: record.messageId })
      batchItemFailures.push({ itemIdentifier: record.messageId })
      // Preserve FIFO ordering by also returning all remaining unprocessed records.
      stopAfterFailure = record.eventSourceARN.endsWith('.fifo')
    }
  }

  return { batchItemFailures }
}
