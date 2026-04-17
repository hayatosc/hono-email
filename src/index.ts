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
export type { FontProps, MarkdownCustomStyles, TailwindConfig } from './components'
import { relocateHeadStyles } from './normalize/head-styles'
import { normalizeHtml } from './normalize/html'
import { relocatePreview } from './normalize/preview'
import { renderFragmentToHtml } from './render/html'
import { prettyPrintHtml } from './render/pretty'
export { pixelBasedPreset } from './tailwind'
import { toPlainText as toPlainTextInternal } from './text'
import { validateHtml } from './validate/html'

export type RenderOptions = {
  doctype?: 'html5' | 'xhtml-transitional' | false
  pretty?: boolean
  strict?: boolean
}

export type RenderResult = {
  html: string
  warnings: string[]
}

const HTML5_DOCTYPE = '<!DOCTYPE html>'
const XHTML_TRANSITIONAL_DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'

const resolveDoctype = (doctype: RenderOptions['doctype']): string => {
  if (doctype === false) {
    return ''
  }

  if (doctype === 'xhtml-transitional') {
    return XHTML_TRANSITIONAL_DOCTYPE
  }

  return HTML5_DOCTYPE
}

export async function render(jsx: Child, options: RenderOptions = {}): Promise<string> {
  const result = await renderWithWarnings(jsx, options)
  return result.html
}

export async function renderWithWarnings(jsx: Child, options: RenderOptions = {}): Promise<RenderResult> {
  const strict = options.strict ?? true
  let html = relocateHeadStyles(relocatePreview(normalizeHtml(await renderFragmentToHtml(jsx))))
  let warnings: string[] = []

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

export async function renderPretty(jsx: Child, options: RenderOptions = {}): Promise<string> {
  return render(jsx, { ...options, pretty: true })
}

export function toPlainText(html: string): string {
  return toPlainTextInternal(html)
}
