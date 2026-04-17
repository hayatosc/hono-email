import type { JSX } from 'hono/jsx'
import { parse } from 'node-html-parser'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

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

const SAFE_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['style', 'align'],
  a: ['href', 'name', 'target', 'rel', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  table: ['align', 'width', 'cellpadding', 'cellspacing', 'border', 'role'],
  td: ['align', 'colspan', 'rowspan'],
  th: ['align', 'colspan', 'rowspan'],
}

const applyElementStyle = (
  html: ReturnType<typeof parse>,
  selector: string,
  style: Record<string, string>
) => {
  for (const element of html.querySelectorAll(selector)) {
    element.setAttribute('style', mergeStyleAttributes(element.getAttribute('style'), style))
  }
}

const applyMarkdownStyles = (
  html: ReturnType<typeof parse>,
  markdownCustomStyles?: MarkdownCustomStyles
) => {
  const mergedStyleMap: Record<MarkdownStyleKey, Record<string, string>> = {
    a: { ...DEFAULT_MARKDOWN_STYLES.a, ...normalizeStyleObject(markdownCustomStyles?.a) },
    blockquote: { ...DEFAULT_MARKDOWN_STYLES.blockquote, ...normalizeStyleObject(markdownCustomStyles?.blockquote) },
    code: { ...DEFAULT_MARKDOWN_STYLES.code, ...normalizeStyleObject(markdownCustomStyles?.code) },
    codeInline: { ...DEFAULT_MARKDOWN_STYLES.codeInline, ...normalizeStyleObject(markdownCustomStyles?.codeInline) },
    h1: { ...DEFAULT_MARKDOWN_STYLES.h1, ...normalizeStyleObject(markdownCustomStyles?.h1) },
    h2: { ...DEFAULT_MARKDOWN_STYLES.h2, ...normalizeStyleObject(markdownCustomStyles?.h2) },
    h3: { ...DEFAULT_MARKDOWN_STYLES.h3, ...normalizeStyleObject(markdownCustomStyles?.h3) },
    h4: { ...DEFAULT_MARKDOWN_STYLES.h4, ...normalizeStyleObject(markdownCustomStyles?.h4) },
    h5: { ...DEFAULT_MARKDOWN_STYLES.h5, ...normalizeStyleObject(markdownCustomStyles?.h5) },
    h6: { ...DEFAULT_MARKDOWN_STYLES.h6, ...normalizeStyleObject(markdownCustomStyles?.h6) },
    img: { ...DEFAULT_MARKDOWN_STYLES.img, ...normalizeStyleObject(markdownCustomStyles?.img) },
    li: { ...DEFAULT_MARKDOWN_STYLES.li, ...normalizeStyleObject(markdownCustomStyles?.li) },
    ol: { ...DEFAULT_MARKDOWN_STYLES.ol, ...normalizeStyleObject(markdownCustomStyles?.ol) },
    p: { ...DEFAULT_MARKDOWN_STYLES.p, ...normalizeStyleObject(markdownCustomStyles?.p) },
    pre: { ...DEFAULT_MARKDOWN_STYLES.pre, ...normalizeStyleObject(markdownCustomStyles?.pre) },
    table: { ...DEFAULT_MARKDOWN_STYLES.table, ...normalizeStyleObject(markdownCustomStyles?.table) },
    tbody: { ...DEFAULT_MARKDOWN_STYLES.tbody, ...normalizeStyleObject(markdownCustomStyles?.tbody) },
    td: { ...DEFAULT_MARKDOWN_STYLES.td, ...normalizeStyleObject(markdownCustomStyles?.td) },
    th: { ...DEFAULT_MARKDOWN_STYLES.th, ...normalizeStyleObject(markdownCustomStyles?.th) },
    thead: { ...DEFAULT_MARKDOWN_STYLES.thead, ...normalizeStyleObject(markdownCustomStyles?.thead) },
    tr: { ...DEFAULT_MARKDOWN_STYLES.tr, ...normalizeStyleObject(markdownCustomStyles?.tr) },
    ul: { ...DEFAULT_MARKDOWN_STYLES.ul, ...normalizeStyleObject(markdownCustomStyles?.ul) },
  }

  applyElementStyle(html, 'a', mergedStyleMap.a)
  applyElementStyle(html, 'blockquote', mergedStyleMap.blockquote)
  applyElementStyle(html, 'h1', mergedStyleMap.h1)
  applyElementStyle(html, 'h2', mergedStyleMap.h2)
  applyElementStyle(html, 'h3', mergedStyleMap.h3)
  applyElementStyle(html, 'h4', mergedStyleMap.h4)
  applyElementStyle(html, 'h5', mergedStyleMap.h5)
  applyElementStyle(html, 'h6', mergedStyleMap.h6)
  applyElementStyle(html, 'img', mergedStyleMap.img)
  applyElementStyle(html, 'li', mergedStyleMap.li)
  applyElementStyle(html, 'ol', mergedStyleMap.ol)
  applyElementStyle(html, 'p', mergedStyleMap.p)
  applyElementStyle(html, 'pre', mergedStyleMap.pre)
  applyElementStyle(html, 'table', mergedStyleMap.table)
  applyElementStyle(html, 'tbody', mergedStyleMap.tbody)
  applyElementStyle(html, 'td', mergedStyleMap.td)
  applyElementStyle(html, 'th', mergedStyleMap.th)
  applyElementStyle(html, 'thead', mergedStyleMap.thead)
  applyElementStyle(html, 'tr', mergedStyleMap.tr)
  applyElementStyle(html, 'ul', mergedStyleMap.ul)

  for (const codeElement of html.querySelectorAll('code')) {
    const style = codeElement.parentNode && 'tagName' in codeElement.parentNode && codeElement.parentNode.tagName === 'PRE'
      ? mergedStyleMap.code
      : mergedStyleMap.codeInline

    codeElement.setAttribute('style', mergeStyleAttributes(codeElement.getAttribute('style'), style))
  }
}

export const renderMarkdownHtml = (
  markdown: string,
  options: MarkdownRenderOptions = {}
): string => {
  const renderedMarkdown = marked.parse(markdown, {
    async: false,
    gfm: true,
  }) as string

  const sanitizedHtml = sanitizeHtml(renderedMarkdown, {
    allowedAttributes: SAFE_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedTags: [...SAFE_MARKDOWN_TAGS],
    disallowedTagsMode: 'discard',
  })

  const html = parse(`<div>${sanitizedHtml}</div>`, {
    lowerCaseTagName: false,
  })

  applyMarkdownStyles(html, options.markdownCustomStyles)

  const container = html.querySelector('div')
  if (container) {
    container.setAttribute(
      'style',
      mergeStyleAttributes(
        container.getAttribute('style'),
        {
          ...DEFAULT_CONTAINER_STYLE,
          ...normalizeStyleObject(options.markdownContainerStyles),
        }
      )
    )
  }

  return html.toString()
}
