import type { JSX } from 'hono/jsx'
import { HTMLRewriter } from 'htmlrewriter'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

import { mergeStyleAttributes, normalizeStyleObject } from '../style'

type MarkdownStyleKey =
  | 'a'
  | 'blockquote'
  | 'code'
  | 'codeInline'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'img'
  | 'li'
  | 'ol'
  | 'p'
  | 'pre'
  | 'table'
  | 'tbody'
  | 'td'
  | 'th'
  | 'thead'
  | 'tr'
  | 'ul'

export type MarkdownCustomStyles = Partial<Record<MarkdownStyleKey, JSX.CSSProperties>>

export type MarkdownRenderOptions = {
  markdownContainerStyles?: JSX.CSSProperties
  markdownCustomStyles?: MarkdownCustomStyles
  sanitize?: boolean
}

const DEFAULT_MARKDOWN_STYLES: Record<MarkdownStyleKey, Record<string, string>> = {
  a: {
    color: '#2563eb',
    'text-decoration': 'underline',
  },
  blockquote: {
    margin: '16px 0',
    padding: '0 0 0 16px',
    color: '#475569',
    'border-left': '4px solid #cbd5e1',
  },
  code: {
    'font-family': 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
  },
  codeInline: {
    'font-family': 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
    'background-color': '#f1f5f9',
    padding: '2px 4px',
    'border-radius': '4px',
  },
  h1: {
    margin: '0 0 16px',
    'font-size': '30px',
    'line-height': '36px',
  },
  h2: {
    margin: '0 0 16px',
    'font-size': '24px',
    'line-height': '32px',
  },
  h3: {
    margin: '0 0 12px',
    'font-size': '20px',
    'line-height': '28px',
  },
  h4: {
    margin: '0 0 12px',
    'font-size': '18px',
    'line-height': '24px',
  },
  h5: {
    margin: '0 0 8px',
    'font-size': '16px',
    'line-height': '22px',
  },
  h6: {
    margin: '0 0 8px',
    'font-size': '14px',
    'line-height': '20px',
  },
  img: {
    display: 'block',
    'max-width': '100%',
  },
  li: {
    margin: '0 0 8px',
  },
  ol: {
    margin: '0 0 16px',
    padding: '0 0 0 24px',
  },
  p: {
    margin: '0 0 16px',
  },
  pre: {
    margin: '0 0 16px',
    padding: '12px',
    overflow: 'auto',
    'background-color': '#f8fafc',
    'border-radius': '6px',
  },
  table: {
    width: '100%',
    'margin-bottom': '16px',
    'border-collapse': 'collapse',
  },
  tbody: {},
  td: {
    padding: '8px',
    border: '1px solid #cbd5e1',
    'vertical-align': 'top',
  },
  th: {
    padding: '8px',
    border: '1px solid #cbd5e1',
    'vertical-align': 'top',
    'text-align': 'left',
    'background-color': '#f8fafc',
  },
  thead: {},
  tr: {},
  ul: {
    margin: '0 0 16px',
    padding: '0 0 0 24px',
  },
}

const DEFAULT_CONTAINER_STYLE = {
  color: '#0f172a',
  'font-size': '14px',
  'line-height': '24px',
}

const SAFE_MARKDOWN_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'small',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
] as const

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)]

const MARKDOWN_SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: unique([...(defaultSchema.tagNames ?? []), ...SAFE_MARKDOWN_TAGS]),
  attributes: {
    ...defaultSchema.attributes,
    '*': unique([...(defaultSchema.attributes?.['*'] ?? []), 'align']),
    a: unique([...(defaultSchema.attributes?.a ?? []), 'name', 'target', 'rel', 'title']),
    img: unique([...(defaultSchema.attributes?.img ?? []), 'alt', 'title', 'width', 'height']),
    table: unique([...(defaultSchema.attributes?.table ?? []), 'align', 'width', 'cellpadding', 'cellspacing', 'border', 'role']),
    td: unique([...(defaultSchema.attributes?.td ?? []), 'align', 'colspan', 'rowspan']),
    th: unique([...(defaultSchema.attributes?.th ?? []), 'align', 'colspan', 'rowspan']),
  },
  protocols: {
    ...defaultSchema.protocols,
    href: unique([...(defaultSchema.protocols?.href ?? []), 'tel']),
  },
}

const normalizeSanitizedMarkdownHtml = async (html: string): Promise<string> =>
  new HTMLRewriter()
    .on('a', {
      element(el) {
        if (!el.getAttribute('href')) {
          el.removeAndKeepContent()
        }
      },
    })
    .on('img', {
      element(el) {
        if (!el.getAttribute('src')) {
          el.remove()
        }
      },
    })
    .transform(new Response(html))
    .text()

export const renderMarkdownHtml = async (
  markdown: string,
  options: MarkdownRenderOptions = {}
): Promise<string> => {
  const htmlSource =
    options.sanitize === false
      ? String(
          await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypeRaw)
            .use(rehypeStringify)
            .process(markdown)
        )
      : await normalizeSanitizedMarkdownHtml(
          String(
            await unified()
              .use(remarkParse)
              .use(remarkGfm)
              .use(remarkRehype, { allowDangerousHtml: true })
              .use(rehypeRaw)
              .use(rehypeSanitize, MARKDOWN_SANITIZE_SCHEMA)
              .use(rehypeStringify)
              .process(markdown)
          )
        )

  const s = options.markdownCustomStyles
  const styles: Record<MarkdownStyleKey, Record<string, string>> = {
    a: { ...DEFAULT_MARKDOWN_STYLES.a, ...normalizeStyleObject(s?.a) },
    blockquote: { ...DEFAULT_MARKDOWN_STYLES.blockquote, ...normalizeStyleObject(s?.blockquote) },
    code: { ...DEFAULT_MARKDOWN_STYLES.code, ...normalizeStyleObject(s?.code) },
    codeInline: { ...DEFAULT_MARKDOWN_STYLES.codeInline, ...normalizeStyleObject(s?.codeInline) },
    h1: { ...DEFAULT_MARKDOWN_STYLES.h1, ...normalizeStyleObject(s?.h1) },
    h2: { ...DEFAULT_MARKDOWN_STYLES.h2, ...normalizeStyleObject(s?.h2) },
    h3: { ...DEFAULT_MARKDOWN_STYLES.h3, ...normalizeStyleObject(s?.h3) },
    h4: { ...DEFAULT_MARKDOWN_STYLES.h4, ...normalizeStyleObject(s?.h4) },
    h5: { ...DEFAULT_MARKDOWN_STYLES.h5, ...normalizeStyleObject(s?.h5) },
    h6: { ...DEFAULT_MARKDOWN_STYLES.h6, ...normalizeStyleObject(s?.h6) },
    img: { ...DEFAULT_MARKDOWN_STYLES.img, ...normalizeStyleObject(s?.img) },
    li: { ...DEFAULT_MARKDOWN_STYLES.li, ...normalizeStyleObject(s?.li) },
    ol: { ...DEFAULT_MARKDOWN_STYLES.ol, ...normalizeStyleObject(s?.ol) },
    p: { ...DEFAULT_MARKDOWN_STYLES.p, ...normalizeStyleObject(s?.p) },
    pre: { ...DEFAULT_MARKDOWN_STYLES.pre, ...normalizeStyleObject(s?.pre) },
    table: { ...DEFAULT_MARKDOWN_STYLES.table, ...normalizeStyleObject(s?.table) },
    tbody: { ...DEFAULT_MARKDOWN_STYLES.tbody, ...normalizeStyleObject(s?.tbody) },
    td: { ...DEFAULT_MARKDOWN_STYLES.td, ...normalizeStyleObject(s?.td) },
    th: { ...DEFAULT_MARKDOWN_STYLES.th, ...normalizeStyleObject(s?.th) },
    thead: { ...DEFAULT_MARKDOWN_STYLES.thead, ...normalizeStyleObject(s?.thead) },
    tr: { ...DEFAULT_MARKDOWN_STYLES.tr, ...normalizeStyleObject(s?.tr) },
    ul: { ...DEFAULT_MARKDOWN_STYLES.ul, ...normalizeStyleObject(s?.ul) },
  }

  const containerStyle = mergeStyleAttributes(undefined, {
    ...DEFAULT_CONTAINER_STYLE,
    ...normalizeStyleObject(options.markdownContainerStyles),
  })

  const applyStyle = (el: { getAttribute(n: string): string | null; setAttribute(n: string, v: string): void }, style: Record<string, string>) => {
    el.setAttribute('style', mergeStyleAttributes(el.getAttribute('style') ?? undefined, style))
  }

  let insidePre = false
  let divDepth = 0

  return new HTMLRewriter()
    .on('div', {
      element(el) {
        divDepth++
        if (divDepth === 1) el.setAttribute('style', containerStyle)
        el.onEndTag(() => { divDepth-- })
      },
    })
    .on('a', { element(el) { applyStyle(el, styles.a) } })
    .on('blockquote', { element(el) { applyStyle(el, styles.blockquote) } })
    .on('h1', { element(el) { applyStyle(el, styles.h1) } })
    .on('h2', { element(el) { applyStyle(el, styles.h2) } })
    .on('h3', { element(el) { applyStyle(el, styles.h3) } })
    .on('h4', { element(el) { applyStyle(el, styles.h4) } })
    .on('h5', { element(el) { applyStyle(el, styles.h5) } })
    .on('h6', { element(el) { applyStyle(el, styles.h6) } })
    .on('img', { element(el) { applyStyle(el, styles.img) } })
    .on('li', { element(el) { applyStyle(el, styles.li) } })
    .on('ol', { element(el) { applyStyle(el, styles.ol) } })
    .on('p', { element(el) { applyStyle(el, styles.p) } })
    .on('pre', {
      element(el) {
        applyStyle(el, styles.pre)
        insidePre = true
        el.onEndTag(() => { insidePre = false })
      },
    })
    .on('code', { element(el) { applyStyle(el, insidePre ? styles.code : styles.codeInline) } })
    .on('table', { element(el) { applyStyle(el, styles.table) } })
    .on('tbody', { element(el) { applyStyle(el, styles.tbody) } })
    .on('td', { element(el) { applyStyle(el, styles.td) } })
    .on('th', { element(el) { applyStyle(el, styles.th) } })
    .on('thead', { element(el) { applyStyle(el, styles.thead) } })
    .on('tr', { element(el) { applyStyle(el, styles.tr) } })
    .on('ul', { element(el) { applyStyle(el, styles.ul) } })
    .transform(new Response(`<div>${htmlSource}</div>`))
    .text()
}
