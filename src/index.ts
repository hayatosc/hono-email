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
import { TAILWIND_ARTIFACT_REQUIRED_ERROR_MESSAGE, TAILWIND_ARTIFACT_REQUIRED_TAG_NAME } from './components'
export type { FontProps, MarkdownCustomStyles, TailwindBuildArtifact } from './components'
import { relocateHeadStyles } from './normalize/head-styles'
import { normalizeHtml } from './normalize/html'
import { relocatePreview } from './normalize/preview'
import { renderFragmentToHtml } from './render/html'
import { prettyPrintHtml } from './render/pretty'
export { buildTailwindArtifactFromCss, collectTailwindClassesFromHtml } from './tailwind'
export type { BuildTailwindArtifactFromCssOptions } from './tailwind'
import { toPlainText as toPlainTextInternal, type ToPlainTextOptions } from './text'
import { validateHtml } from './validate/html'

type BaseRenderOptions = {
  doctype?: 'html5' | 'xhtml-transitional' | false
  pretty?: boolean
  strict?: boolean
}

export type HtmlRenderOptions = BaseRenderOptions & {
  output?: 'html'
}

export type TextRenderOptions = BaseRenderOptions & {
  output: 'text'
  text?: ToPlainTextOptions
}

export type RenderOptions = HtmlRenderOptions | TextRenderOptions

export type RenderResult = {
  html: string
  warnings: string[]
}

export type { BaseRenderOptions, ToPlainTextOptions }

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

const renderHtmlWithWarnings = async (jsx: Child, options: BaseRenderOptions = {}): Promise<RenderResult> => {
  const strict = options.strict ?? true
  let html = relocateHeadStyles(relocatePreview(normalizeHtml(await renderFragmentToHtml(jsx))))
  let warnings: string[] = []

  if (html.includes(`<${TAILWIND_ARTIFACT_REQUIRED_TAG_NAME}`)) {
    throw new Error(TAILWIND_ARTIFACT_REQUIRED_ERROR_MESSAGE)
  }

  if (strict) {
    warnings = validateHtml(html)
  }

  const doctype = resolveDoctype(options.doctype)

  if (doctype !== '') {
    html = `${doctype}${html}`
  }

  if (options.pretty) {
    html = prettyPrintHtml(html)
  }

  return { html, warnings }
}

export async function render(jsx: Child, options?: HtmlRenderOptions): Promise<string>
export async function render(jsx: Child, options: TextRenderOptions): Promise<string>
export async function render(jsx: Child, options: RenderOptions = {}): Promise<string> {
  const result = await renderHtmlWithWarnings(jsx, options)

  if (options.output === 'text') {
    return toPlainTextInternal(result.html, options.text)
  }

  return result.html
}

export async function renderWithWarnings(jsx: Child, options: BaseRenderOptions = {}): Promise<RenderResult> {
  return renderHtmlWithWarnings(jsx, options)
}

export async function renderPretty(jsx: Child, options: BaseRenderOptions = {}): Promise<string> {
  return render(jsx, { ...options, output: 'html', pretty: true })
}

export async function renderText(
  jsx: Child,
  renderOptions: BaseRenderOptions = {},
  textOptions: ToPlainTextOptions = {}
): Promise<string> {
  return render(jsx, {
    ...renderOptions,
    output: 'text',
    text: textOptions,
  })
}

export function toPlainText(html: string, options: ToPlainTextOptions = {}): string {
  return toPlainTextInternal(html, options)
}
