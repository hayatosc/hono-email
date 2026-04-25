import type { Child } from 'hono/jsx'

export {
  Body,
  Button,
  Column,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Markdown,
  Preview,
  Row,
  Section,
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
import { renderFragmentToHtml } from './render/html'
import { prettyPrintHtml } from './render/pretty'
import {
  buildTailwindArtifactFromCss,
  transformTailwindHtml,
  wrapGeneratedHeadCss,
} from './tailwind'
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
const HONO_CSS_STYLE_ID = 'hono-css'
const HONO_CSS_STYLE_TAG_PATTERN = new RegExp(
  `<style\\b(?=[^>]*\\bid=(["'])${HONO_CSS_STYLE_ID}\\1)[^>]*>([\\s\\S]*?)<\\/style>`,
  'gi',
)
const HONO_CSS_RUNTIME_SCRIPT_PATTERN = new RegExp(
  `<script\\b[^>]*>[\\s\\S]*?document\\.querySelector\\((["'])#${HONO_CSS_STYLE_ID}\\1\\)\\.textContent\\+=`,
  'i',
)
const HONO_CSS_RUNTIME_SCRIPT_TAG_PATTERN = new RegExp(
  `<script\\b[^>]*>[\\s\\S]*?document\\.querySelector\\((["'])#${HONO_CSS_STYLE_ID}\\1\\)\\.textContent\\+=(["'])([\\s\\S]*?)\\2;?[\\s\\S]*?<\\/script>`,
  'gi',
)
const HONO_CSS_STYLE_REQUIRED_ERROR_MESSAGE =
  'hono/css styles require <Head><Style /></Head> in hono-email. Import Style from "hono/css" and place it inside <Head>.'
const HONO_CSS_STYLE_HEAD_REQUIRED_ERROR_MESSAGE =
  'The hono/css <Style /> tag must be inside <Head> when rendering with hono-email.'

const resolveDoctype = (doctype: BaseRenderOptions['doctype']): string => {
  if (doctype === false) {
    return ''
  }

  if (doctype === 'xhtml-transitional') {
    return XHTML_TRANSITIONAL_DOCTYPE
  }

  return HTML5_DOCTYPE
}

const extractHeadBounds = (html: string): { headOpen: number; headClose: number } => {
  const headOpenMatch = html.match(/<head\b[^>]*>/i)
  const headCloseMatch = html.match(/<\/head>/i)
  return {
    headOpen: headOpenMatch?.index ?? -1,
    headClose: headCloseMatch?.index ?? -1,
  }
}

const decodeHonoCssRuntimeString = (rawCss: string): string =>
  rawCss
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")

const extractHonoCssFromHtml = (
  html: string,
): { css: string; foundStyleTag: boolean; html: string } => {
  const { headClose, headOpen } = extractHeadBounds(html)
  const cssChunks: string[] = []
  let foundStyleTag = false

  const stripped = html.replace(
    HONO_CSS_STYLE_TAG_PATTERN,
    (_fullMatch: string, _quote: string, cssText: string, offset: number) => {
      const insideHead =
        headOpen >= 0 && headClose >= 0 && offset >= headOpen && offset <= headClose
      if (!insideHead) {
        throw new Error(HONO_CSS_STYLE_HEAD_REQUIRED_ERROR_MESSAGE)
      }
      foundStyleTag = true
      cssChunks.push(cssText)
      return ''
    },
  )

  return {
    css: cssChunks.join('\n').trim(),
    foundStyleTag,
    html: stripped,
  }
}

const extractHonoCssRuntimeScripts = (
  html: string,
): { css: string; foundScript: boolean; html: string } => {
  const cssChunks: string[] = []
  let foundScript = false

  const stripped = html.replace(
    HONO_CSS_RUNTIME_SCRIPT_TAG_PATTERN,
    (_fullMatch: string, _selectorQuote: string, _cssQuote: string, rawCssText: string) => {
      foundScript = true
      cssChunks.push(decodeHonoCssRuntimeString(rawCssText))
      return ''
    },
  )

  return {
    css: cssChunks.join('\n').trim(),
    foundScript,
    html: stripped,
  }
}

const transformHonoCssOutput = async (html: string): Promise<string> => {
  const extracted = extractHonoCssFromHtml(html)
  const runtimeExtracted = extractHonoCssRuntimeScripts(extracted.html)

  if (runtimeExtracted.foundScript && !extracted.foundStyleTag) {
    throw new Error(HONO_CSS_STYLE_REQUIRED_ERROR_MESSAGE)
  }

  const css = [extracted.css, runtimeExtracted.css]
    .filter((chunk) => chunk !== '')
    .join('\n')
    .trim()
  if (css === '') {
    if (HONO_CSS_RUNTIME_SCRIPT_PATTERN.test(html)) {
      throw new Error(HONO_CSS_STYLE_REQUIRED_ERROR_MESSAGE)
    }
    return runtimeExtracted.html
  }

  const artifact = buildTailwindArtifactFromCss({ css })
  const transformed = await transformTailwindHtml(runtimeExtracted.html, artifact, {
    preserveMarkdownTailwindParentRequiredAttribute: true,
    throwOnMissingClass: false,
  })

  return `${wrapGeneratedHeadCss(transformed.headCss)}${transformed.html}`
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
