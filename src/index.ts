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
import { minifyHtml } from './transform/minify'
import { preventWidows } from './transform/prevent-widows'
import { ensureSixHex } from './transform/six-hex'
export { buildTailwindArtifactFromCss, collectTailwindClassesFromHtml } from './tailwind'
export type { BuildTailwindArtifactFromCssOptions } from './tailwind'
import { renderPlainText, type PlainTextRenderOptions } from './text'
import { validateHtml } from './validate/html'

/**
 * Shared HTML render options.
 *
 * @property doctype - Doctype to prepend. Defaults to HTML5.
 * @property pretty - Pretty-print the rendered HTML when `true`. Takes precedence over `minify`.
 * @property minify - Minify the rendered HTML. Defaults to `true`. Ignored when `pretty` is `true`.
 * @property widows - Join the last two words of each text node with `&nbsp;` when `true`.
 * @property strict - Run strict email validation when `true`. Defaults to `true`.
 *
 * @example
 * ```tsx
 * const options: BaseRenderOptions = {
 *   doctype: 'xhtml-transitional',
 *   pretty: true,
 * }
 * ```
 */
type BaseRenderOptions = {
  doctype?: 'html5' | 'xhtml-transitional' | false
  pretty?: boolean
  minify?: boolean
  widows?: boolean
  strict?: boolean
}

/**
 * Options for rendering JSX into HTML and derived plain text.
 *
 * @property text - Plain-text conversion options.
 *
 * @example
 * ```tsx
 * await render(<WelcomeEmail />, {
 *   text: { linkFormat: 'text-only' },
 * })
 * ```
 */
export type RenderOptions = BaseRenderOptions & {
  text?: PlainTextRenderOptions
}

/**
 * HTML email output and the plain-text version generated from it.
 *
 * @property html - Rendered HTML email, including the configured doctype.
 * @property text - Plain-text output derived from the rendered HTML.
 *
 * @example
 * ```tsx
 * const result: RenderResult = await render(<WelcomeEmail />)
 * console.log(result.html, result.text)
 * ```
 */
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

  html = ensureSixHex(html)

  if (options.widows) {
    html = preventWidows(html)
  }

  const doctype = resolveDoctype(options.doctype)

  if (doctype !== '') {
    html = `${doctype}${html}`
  }

  if (options.pretty) {
    html = prettyPrintHtml(html)
  } else if (options.minify !== false) {
    html = minifyHtml(html)
  }

  return html
}

/**
 * Renders a `hono/jsx` email tree into HTML and plain text.
 *
 * @param jsx - Email JSX tree to render.
 * @param options - Render options.
 * @returns Rendered HTML and derived plain text.
 *
 * @example
 * ```tsx
 * const { html, text } = await render(
 *   <Html>
 *     <Body>
 *       <Text>Hello from hono-email.</Text>
 *     </Body>
 *   </Html>,
 * )
 * ```
 */
export async function render(jsx: Child, options: RenderOptions = {}): Promise<RenderResult> {
  const html = await renderHtml(jsx, options)

  return {
    html,
    text: renderPlainText(html, options.text),
  }
}

/**
 * Renders a JSX email draft and sends it through the provided adapter.
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
