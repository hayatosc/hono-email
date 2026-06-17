import { env } from 'cloudflare:workers'

import type {
  CloudflareEmailBinding,
  CloudflareEmailConnector,
  CloudflareEmailConnectorRequest,
  CloudflareEmailConnectorResult,
  CloudflareEmailWorkersConnectorOptions,
} from '../../cloudflare/types'

export type {
  CloudflareEmailBinding,
  CloudflareEmailBindingSendResult,
  CloudflareEmailConnector,
  CloudflareEmailConnectorRequest,
  CloudflareEmailConnectorResult,
  CloudflareEmailWorkersConnectorOptions,
  CloudflareEmailWorkerNameAddress,
  CloudflareEmailWorkerAttachment,
  CloudflareEmailWorkerPayload,
} from '../../cloudflare/types'

const createAcceptedResponse = (recipients: string[]): string =>
  `Cloudflare Email Service accepted ${recipients.length} recipient(s).`

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

const buildConnector = (bindingName: string): CloudflareEmailConnector => ({
  async send(request: CloudflareEmailConnectorRequest): Promise<CloudflareEmailConnectorResult> {
    const binding = resolveEmailBinding(bindingName)
    const result = await binding.send(request.workersPayload)

    return {
      delivered: request.recipients,
      messageId: result?.messageId,
      permanentBounces: [],
      queued: [],
      response: createAcceptedResponse(request.recipients),
    }
  },
})

/**
 * Creates a Cloudflare Workers Email binding connector.
 *
 * @param options - Workers binding options.
 * @returns A Cloudflare Email connector.
 *
 * @example
 * ```ts
 * const connector = createWorkersConnector({ bindingName: 'EMAIL' })
 * ```
 */
export const createWorkersConnector = (
  options?: CloudflareEmailWorkersConnectorOptions,
): CloudflareEmailConnector => buildConnector(options?.bindingName ?? 'EMAIL')

/**
 * Default Cloudflare Workers Email connector using the `EMAIL` binding.
 *
 * @example
 * ```ts
 * const adapter = CloudflareEmailAdapter({ connector: WorkersConnector })
 * ```
 */
export const WorkersConnector: CloudflareEmailConnector = buildConnector('EMAIL')

export default WorkersConnector
