import type {
  CloudflareEmailBinding,
  CloudflareEmailConnector,
  CloudflareEmailConnectorRequest,
  CloudflareEmailConnectorResult,
} from './cloudflare-email-types'
import { createCloudflareEmailAdapter } from './cloudflare-email-adapter'

export type {
  CloudflareEmailBinding,
  CloudflareEmailBindingSendResult,
  CloudflareEmailConnector,
  CloudflareEmailConnectorRequest,
  CloudflareEmailConnectorResult,
  CloudflareEmailWorkerNameAddress,
  CloudflareEmailWorkerPayload,
} from './cloudflare-email-types'

const createAcceptedResponse = (recipients: string[]): string =>
  `Cloudflare Email Service accepted ${recipients.length} recipient(s).`

const createWorkersConnector = (binding: CloudflareEmailBinding): CloudflareEmailConnector => ({
  async send(request: CloudflareEmailConnectorRequest): Promise<CloudflareEmailConnectorResult> {
    const result = await binding.send(request.workersPayload)

    return {
      delivered: request.recipients,
      messageId: result.messageId,
      permanentBounces: [],
      queued: [],
      response: createAcceptedResponse(request.recipients),
    }
  },
})

export const WorkersConnector = (binding: CloudflareEmailBinding) =>
  createCloudflareEmailAdapter(createWorkersConnector(binding))
