import { SESv2Client } from '@aws-sdk/client-sesv2'
import type { SQSBatchResponse, SQSEvent } from 'aws-lambda'
import { SesAdapter } from 'hono-email/aws-ses'

import { processEmailBatch } from './worker'

// Reuse connections and the execution role's credentials across warm invocations.
const adapter = SesAdapter({
  client: new SESv2Client({
    maxAttempts: 1,
    requestHandler: {
      connectionTimeout: 2_000,
      requestTimeout: 10_000,
      throwOnRequestTimeout: true,
    },
  }),
  tags: { app: 'welcome-worker' },
})

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const from = process.env.EMAIL_FROM
  if (!from) throw new Error('EMAIL_FROM must be configured.')
  return processEmailBatch(event, adapter, from)
}
