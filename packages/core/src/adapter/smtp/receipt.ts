import type { EmailErrorCategory, SendEmailReceipt } from '../index'
import { SmtpCommandError, SmtpResponseBufferLimitError } from './protocol'

export const CLOSED_TRANSPORT_ERROR_MESSAGE = 'SMTP transport is closed.'

export class SmtpTransportClosedError extends Error {
  constructor() {
    super(CLOSED_TRANSPORT_ERROR_MESSAGE)
    this.name = 'SmtpTransportClosedError'
  }
}

export type SmtpFailureClassification = {
  category: EmailErrorCategory
  permanent?: boolean
  code?: number | string
  enhancedCode?: string
}

export const classifySmtpFailure = (error: unknown): SmtpFailureClassification => {
  if (error instanceof SmtpCommandError) {
    return {
      category: 'smtp',
      permanent: error.permanent,
      code: error.code,
      ...(error.enhancedCode !== undefined ? { enhancedCode: error.enhancedCode } : {}),
    }
  }

  if (error instanceof SmtpResponseBufferLimitError) {
    return {
      category: 'smtp',
      permanent: false,
    }
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError' || /timed out/i.test(error.message)) {
      return { category: 'timeout', permanent: false }
    }

    if (
      /^Invalid (email|header|attachment|SMTP)/i.test(error.message) ||
      /exceeds maximum size/i.test(error.message) ||
      /must not contain/i.test(error.message) ||
      /cannot be folded/i.test(error.message) ||
      /requires.*support/i.test(error.message) ||
      /requires at least one/i.test(error.message) ||
      /must include at least one recipient/i.test(error.message)
    ) {
      return { category: 'validation', permanent: true }
    }

    return { category: 'connection', permanent: false }
  }

  return { category: 'unknown', permanent: false }
}

export const failedReceipt = (
  error: unknown,
  accepted: string[] = [],
  rejected: string[] = [],
): SendEmailReceipt => {
  const classification = classifySmtpFailure(error)
  const response = error instanceof SmtpCommandError ? error.response : undefined
  return {
    successful: false,
    accepted,
    rejected,
    errorMessages: [error instanceof Error ? error.message : String(error)],
    cause: error,
    ...(response !== undefined ? { response } : {}),
    category: classification.category,
    ...(classification.permanent !== undefined ? { permanent: classification.permanent } : {}),
    ...(classification.code !== undefined ? { code: classification.code } : {}),
    ...(classification.enhancedCode !== undefined
      ? { enhancedCode: classification.enhancedCode }
      : {}),
  }
}

export const isClosedTransportError = (error: unknown): boolean =>
  error instanceof SmtpTransportClosedError
