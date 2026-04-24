import { env } from 'cloudflare:workers'

import { createCloudflareEmailAdapter } from '../../cloudflare-email/adapter'
import type {
  CloudflareEmailBinding,
  CloudflareEmailConnector,
  CloudflareEmailConnectorRequest,
  CloudflareEmailConnectorResult,
} from '../../cloudflare-email/types'

export type {
  CloudflareEmailBinding,
  CloudflareEmailBindingSendResult,
  CloudflareEmailConnector,
  CloudflareEmailConnectorRequest,
  CloudflareEmailConnectorResult,
  CloudflareEmailWorkerNameAddress,
  CloudflareEmailWorkerPayload,
} from '../../cloudflare-email/types'

const createAcceptedResponse = (recipients: string[]): string =>
  `Cloudflare Email Service accepted ${recipients.length} recipient(s).`

const createWorkersConnector = (binding: CloudflareEmailBinding): CloudflareEmailConnector => ({
  async send(request: CloudflareEmailConnectorRequest): Promise<CloudflareEmailConnectorResult> {
    const result = await binding.send(request.workersPayload)

    return {
      delivered: request.recipients,
      // Local preview bindings may accept the send but omit EmailSendResult.
      messageId: result?.messageId,
      permanentBounces: [],
      queued: [],
      response: createAcceptedResponse(request.recipients),
    }
  },
})

const isCloudflareEmailBinding = (value: unknown): value is CloudflareEmailBinding =>
  typeof value === 'object' &&
  value !== null &&
  'send' in value &&
  typeof Reflect.get(value, 'send') === 'function'

const resolveEmailBinding = (bindingName: string): CloudflareEmailBinding => {
  const rawBinding: unknown = Reflect.get(env, bindingName)
  if (!isCloudflareEmailBinding(rawBinding)) {
    throw new Error(
      `Cloudflare Email binding \`${bindingName}\` is unavailable. Configure \`send_email\` in wrangler.jsonc.`,
    )
  }
  return rawBinding
}

const WorkersConnector = (options?: { bindingName?: string }) => {
  const bindingName = options?.bindingName ?? 'EMAIL'
  return createCloudflareEmailAdapter(createWorkersConnector(resolveEmailBinding(bindingName)))
}

export default WorkersConnector
