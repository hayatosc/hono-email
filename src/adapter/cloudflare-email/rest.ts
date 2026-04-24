import type {
  CloudflareEmailConnector,
  CloudflareEmailConnectorRequest,
  CloudflareEmailConnectorResult,
  CloudflareEmailRestConnectorOptions,
} from './types'
import { CloudflareEmailConnectorError } from './types'
import { createCloudflareEmailAdapter } from './adapter'

export type {
  CloudflareEmailConnector,
  CloudflareEmailConnectorRequest,
  CloudflareEmailConnectorResult,
  CloudflareEmailFetch,
  CloudflareEmailFetchInit,
  CloudflareEmailNameAddress,
  CloudflareEmailRecipientField,
  CloudflareEmailRestConnectorOptions,
  CloudflareEmailRestPayload,
} from './types'

const DEFAULT_API_BASE_URL = 'https://api.cloudflare.com/client/v4'

export type CloudflareApiMessage = {
  code?: number
  message: string
}

type CloudflareRestResult = {
  delivered: string[]
  permanent_bounces: string[]
  queued: string[]
}

type CloudflareRestResponse = {
  errors: CloudflareApiMessage[]
  messages: CloudflareApiMessage[]
  result: CloudflareRestResult | null
  success: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const isCloudflareApiMessage = (value: unknown): value is CloudflareApiMessage => {
  if (!isRecord(value) || typeof value.message !== 'string') {
    return false
  }

  return value.code === undefined || typeof value.code === 'number'
}

const isCloudflareRestResult = (value: unknown): value is CloudflareRestResult =>
  isRecord(value) &&
  isStringArray(value.delivered) &&
  isStringArray(value.permanent_bounces) &&
  isStringArray(value.queued)

const isCloudflareRestResponse = (value: unknown): value is CloudflareRestResponse =>
  isRecord(value) &&
  typeof value.success === 'boolean' &&
  Array.isArray(value.errors) &&
  value.errors.every(isCloudflareApiMessage) &&
  Array.isArray(value.messages) &&
  value.messages.every(isCloudflareApiMessage) &&
  (value.result === null || isCloudflareRestResult(value.result))

const formatApiMessage = (message: CloudflareApiMessage): string =>
  message.code === undefined ? message.message : `${message.code}: ${message.message}`

const readJsonResponse = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (text === '') {
    return undefined
  }

  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    throw new CloudflareEmailConnectorError(['Cloudflare Email REST API returned invalid JSON.'], {
      cause: error,
    })
  }
}

const buildResponseText = (result: CloudflareRestResult): string =>
  `Cloudflare Email Service delivered ${result.delivered.length}, queued ${result.queued.length}, bounced ${result.permanent_bounces.length}.`

const createMissingFetchError = (): Error =>
  new Error('Cloudflare REST connector requires a fetch implementation.')

const createRestConnector = (
  options: CloudflareEmailRestConnectorOptions,
): CloudflareEmailConnector => {
  const fetchImplementation = options.fetch ?? globalThis.fetch
  if (fetchImplementation === undefined) {
    throw createMissingFetchError()
  }

  return {
    async send(request: CloudflareEmailConnectorRequest): Promise<CloudflareEmailConnectorResult> {
      const response = await fetchImplementation(
        `${options.apiBaseUrl ?? DEFAULT_API_BASE_URL}/accounts/${encodeURIComponent(options.accountId)}/email/sending/send`,
        {
          body: JSON.stringify(request.restPayload),
          headers: {
            Authorization: `Bearer ${options.apiToken}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
      )
      const json = await readJsonResponse(response)
      if (!isCloudflareRestResponse(json)) {
        throw new CloudflareEmailConnectorError([
          'Cloudflare Email REST API returned an unexpected response.',
        ])
      }

      if (!response.ok || !json.success || json.result === null) {
        const errorMessages = json.errors.map(formatApiMessage)
        throw new CloudflareEmailConnectorError(
          errorMessages.length > 0
            ? errorMessages
            : ['Cloudflare Email REST API rejected the email.'],
          {
            rejected: request.recipients,
            response: JSON.stringify(json),
          },
        )
      }

      return {
        delivered: json.result.delivered,
        permanentBounces: json.result.permanent_bounces,
        queued: json.result.queued,
        response: buildResponseText(json.result),
      }
    },
  }
}

export const RESTConnector = (options: CloudflareEmailRestConnectorOptions) =>
  createCloudflareEmailAdapter(createRestConnector(options))
