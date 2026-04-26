import type { SendEmailReceipt } from '../index'

export const CLOSED_TRANSPORT_ERROR_MESSAGE = 'SMTP transport is closed.'

export const failedReceipt = (
  error: unknown,
  accepted: string[] = [],
  rejected: string[] = [],
): SendEmailReceipt => ({
  successful: false,
  accepted,
  rejected,
  errorMessages: [error instanceof Error ? error.message : String(error)],
  cause: error,
})

export const isClosedTransportError = (error: unknown): boolean =>
  error instanceof Error && error.message === CLOSED_TRANSPORT_ERROR_MESSAGE
