import {
  renderEmailMessage as renderEmailMessageWithRender,
  sendEmail as sendEmailWithRender,
} from '../email'
import type { EmailMessage, EmailMessageDraft, SendEmailOptions, SendEmailReceipt } from '../email'
import { render } from '../index'

export type {
  EmailAdapter,
  EmailAddress,
  EmailAttachment,
  EmailAttachmentContent,
  EmailAttachmentDisposition,
  EmailAttachmentEncoding,
  EmailAttachmentLimits,
  EmailDkimOptions,
  EmailEnvelope,
  EmailHeaders,
  EmailMessage,
  EmailMessageDraft,
  EmailTransport,
  FailedSendReceipt,
  SendEmailOptions,
  SendEmailReceipt,
  SuccessfulSendReceipt,
} from '../email'

/**
 * Renders a JSX draft into a transport-ready email message.
 *
 * @param draft - Email draft containing JSX and message metadata.
 * @returns Fully rendered email message.
 *
 * @example
 * ```tsx
 * const message = await renderEmailMessage({
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Welcome',
 *   jsx: <Html><Body><Text>Hello</Text></Body></Html>,
 * })
 * ```
 */
export const renderEmailMessage = async (draft: EmailMessageDraft): Promise<EmailMessage> =>
  renderEmailMessageWithRender(render, draft)

/**
 * Renders and sends a JSX email draft through the provided adapter.
 *
 * @param options - Email draft and delivery adapter.
 * @returns Delivery receipt from the adapter.
 *
 * @example
 * ```tsx
 * const receipt = await sendEmail({
 *   adapter,
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Welcome',
 *   jsx: <Html><Body><Text>Hello</Text></Body></Html>,
 * })
 * ```
 */
export const sendEmail = async (options: SendEmailOptions): Promise<SendEmailReceipt> =>
  sendEmailWithRender(render, options)
