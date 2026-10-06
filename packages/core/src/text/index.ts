import { decodeNamedCharacterReference } from 'decode-named-character-reference'

import { readAttribute } from '../html-attribute'
import { tokenizeHtml } from '../html-tokenizer'

export type PlainTextRenderOptions = {
  headingStyle?: 'preserve' | 'uppercase'
  hrSeparator?: string
  includeImageAlt?: boolean
  linkFormat?: 'href-only' | 'text-and-href' | 'text-only'
  listBullet?: string
}

const DEFAULT_PLAIN_TEXT_RENDER_OPTIONS: Required<PlainTextRenderOptions> = {
  headingStyle: 'uppercase',
  hrSeparator: '---',
  includeImageAlt: true,
  linkFormat: 'text-and-href',
  listBullet: '-',
}

const HEADING_START = '\uE000'
const HEADING_END = '\uE001'
const stripHeadingMarkers = (text: string): string => text.replace(/[\uE000\uE001]/g, '')

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

type OpenElement = {
  tag: string
  skipped: boolean
  link?: { href: string; start: number; contentStart: number }
}

const ENTITY_PATTERN = /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi

const decodeHtmlEntities = (text: string): string =>
  text.replace(ENTITY_PATTERN, (entity: string, body: string) => {
    if (body[0] === '#') {
      const codePoint =
        body[1] === 'x' || body[1] === 'X'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10)

      if (!Number.isFinite(codePoint) || codePoint < 1 || codePoint > 0x10ffff) {
        return entity
      }

      return String.fromCodePoint(codePoint)
    }

    return decodeNamedCharacterReference(body) || entity
  })

const collapseWhitespace = (text: string): string => {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

const formatLink = (
  label: string,
  href: string,
  linkFormat: Required<PlainTextRenderOptions>['linkFormat'],
): string => {
  if (linkFormat === 'href-only') {
    return href
  }

  if (linkFormat === 'text-only') {
    return label
  }

  return label.trim() === '' ? href : `${label} (${href})`
}

const formatImage = (attributes: string, includeImageAlt: boolean): string => {
  if (!includeImageAlt) {
    return ''
  }

  return readAttribute(attributes, 'alt') ?? ''
}

export const renderPlainText = (html: string, options: PlainTextRenderOptions = {}): string => {
  const resolvedOptions = {
    ...DEFAULT_PLAIN_TEXT_RENDER_OPTIONS,
    ...options,
  }

  const stack: OpenElement[] = []
  let text = ''

  for (const token of tokenizeHtml(html)) {
    const parentSkipped = stack.at(-1)?.skipped ?? false

    if (token.type === 'text') {
      if (!parentSkipped) text += token.raw
      continue
    }
    if (token.type !== 'tag') continue

    const tag = token.name
    const heading = /^h[1-6]$/.test(tag)

    if (token.closing) {
      let index = stack.length - 1
      while (index >= 0 && stack[index]?.tag !== tag) index -= 1
      const element = stack[index]
      if (index >= 0) stack.length = index
      if (parentSkipped) continue

      if (element?.link) {
        const { href, start, contentStart } = element.link
        // Trim source edges while preserving whitespace inside inline children.
        const sourceLabel = html.slice(contentStart, token.start)
        const leadingWhitespace = sourceLabel.length - sourceLabel.trimStart().length
        const trailingWhitespace = sourceLabel.length - sourceLabel.trimEnd().length
        const label = text.slice(start + leadingWhitespace, text.length - trailingWhitespace)
        text = text.slice(0, start) + formatLink(label, href, resolvedOptions.linkFormat)
      } else if (tag === 'p') {
        text += '\n\n'
      } else if (tag === 'div') {
        text += '\n'
      } else if (heading) {
        text += `${HEADING_END}\n\n`
      }
      continue
    }

    const attributes = html.slice(token.nameEnd, token.end - 1)
    const skipped =
      parentSkipped ||
      tag === 'style' ||
      tag === 'script' ||
      (tag === 'div' &&
        readAttribute(attributes, 'data-hono-email-preview')?.toLowerCase() === 'true')
    const element: OpenElement = { tag, skipped }

    if (!skipped && tag === 'a') {
      const href = readAttribute(attributes, 'href')
      if (href !== undefined) element.link = { href, start: text.length, contentStart: token.end }
    }
    if (!token.selfClosing && !VOID_TAGS.has(tag)) stack.push(element)
    if (skipped) continue

    if (tag === 'hr') {
      text += `\n${resolvedOptions.hrSeparator}\n`
    } else if (tag === 'br') {
      text += '\n'
    } else if (tag === 'li') {
      text += `\n${resolvedOptions.listBullet} `
    } else if (tag === 'img') {
      text += formatImage(attributes, resolvedOptions.includeImageAlt)
    } else if (heading) {
      text += `\n\n${HEADING_START}`
    }
  }

  const collapsed = collapseWhitespace(decodeHtmlEntities(text))

  if (resolvedOptions.headingStyle !== 'uppercase') {
    return stripHeadingMarkers(collapsed)
  }

  const headingPattern = new RegExp(`${HEADING_START}([\\s\\S]*?)${HEADING_END}`, 'g')
  return stripHeadingMarkers(
    collapsed.replace(headingPattern, (_match, heading: string) => heading.toUpperCase()),
  )
}
