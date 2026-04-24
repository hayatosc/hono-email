import { render } from '../index'
import {
  renderEmailMessage as renderEmailMessageWithRender,
  sendEmail as sendEmailWithRender,
} from '../email'
import type {
  EmailMessage,
  EmailMessageDraft,
  SendEmailOptions,
  SendEmailReceipt,
} from '../email'

export type {
  EmailAdapter,
  EmailAddress,
  EmailHeaders,
  EmailMessage,
  EmailMessageDraft,
  EmailTransport,
  FailedSendReceipt,
  SendEmailOptions,
  SendEmailReceipt,
  SuccessfulSendReceipt,
} from '../email'

export const renderEmailMessage = async (draft: EmailMessageDraft): Promise<EmailMessage> =>
  renderEmailMessageWithRender(render, draft)

export const sendEmail = async (options: SendEmailOptions): Promise<SendEmailReceipt> =>
  sendEmailWithRender(render, options)
