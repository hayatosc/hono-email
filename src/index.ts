import type { Child } from 'hono/jsx'

export {
  Body,
  Box,
  Button,
  Card,
  CodeBlock,
  CodeInline,
  Column,
  ColorScheme,
  Conditional,
  Container,
  Flex,
  Font,
  Grid,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  List,
  ListItem,
  Markdown,
  Preview,
  Row,
  Section,
  Spacer,
  Tailwind,
  Text,
} from './components'
import {
  TAILWIND_ARTIFACT_REQUIRED_ERROR_MESSAGE,
  TAILWIND_ARTIFACT_REQUIRED_TAG_NAME,
} from './components'
import {
  sendEmail as sendEmailWithRender,
  type SendEmailOptions,
  type SendEmailReceipt,
} from './email'
export type {
  FontProps,
  MarkdownCustomClassNames,
  MarkdownCustomStyles,
  MarkdownStyleMode,
  TailwindBuildArtifact,
} from './components'
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
} from './email'
import {
  MARKDOWN_TAILWIND_PARENT_REQUIRED_ATTRIBUTE_NAME,
  MARKDOWN_TAILWIND_PARENT_REQUIRED_ERROR_MESSAGE,
} from './markdown'
import { relocateHeadStyles } from './normalize/head-styles'
import { normalizeHtml } from './normalize/html'
import { relocatePreview } from './normalize/preview'
import { transformHonoCssOutput } from './render/hono-css'
import { renderFragmentToHtml } from './render/html'
import { prettyPrintHtml } from './render/pretty'
export { buildTailwindArtifactFromCss, collectTailwindClassesFromHtml } from './tailwind'
export type { BuildTailwindArtifactFromCssOptions } from './tailwind'
import { renderPlainText, type PlainTextRenderOptions } from './text'
import { validateHtml } from './validate/html'

type BaseRenderOptions = {
  doctype?: 'html5' | 'xhtml-transitional' | false
  pretty?: boolean
  strict?: boolean
}

export type RenderOptions = BaseRenderOptions & {
  text?: PlainTextRenderOptions
}

export type RenderResult = {
  html: string
  text: string
}

export type { BaseRenderOptions }

const HTML5_DOCTYPE = '<!DOCTYPE html>'
const XHTML_TRANSITIONAL_DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'

const resolveDoctype = (doctype: BaseRenderOptions['doctype']): string => {
  if (doctype === false) {
    return ''
  }

  if (doctype === 'xhtml-transitional') {
    return XHTML_TRANSITIONAL_DOCTYPE
  }

  return HTML5_DOCTYPE
}

const renderHtml = async (jsx: Child, options: BaseRenderOptions = {}): Promise<string> => {
  const strict = options.strict ?? true
  let html = relocateHeadStyles(relocatePreview(normalizeHtml(await renderFragmentToHtml(jsx))))
  html = relocateHeadStyles(await transformHonoCssOutput(html))

  if (html.includes(MARKDOWN_TAILWIND_PARENT_REQUIRED_ATTRIBUTE_NAME)) {
    throw new Error(MARKDOWN_TAILWIND_PARENT_REQUIRED_ERROR_MESSAGE)
  }

  if (html.includes(`<${TAILWIND_ARTIFACT_REQUIRED_TAG_NAME}`)) {
    throw new Error(TAILWIND_ARTIFACT_REQUIRED_ERROR_MESSAGE)
  }

  if (strict) {
    const warnings = validateHtml(html)
    for (const warning of warnings) {
      console.warn(`[hono-email] ${warning}`)
    }
  }

  const doctype = resolveDoctype(options.doctype)

  if (doctype !== '') {
    html = `${doctype}${html}`
  }

  if (options.pretty) {
    html = prettyPrintHtml(html)
  }

  return html
}

export async function render(jsx: Child, options: RenderOptions = {}): Promise<RenderResult> {
  const html = await renderHtml(jsx, options)

  return {
    html,
    text: renderPlainText(html, options.text),
  }
}

export const sendEmail = async (options: SendEmailOptions): Promise<SendEmailReceipt> =>
  sendEmailWithRender(render, options)
