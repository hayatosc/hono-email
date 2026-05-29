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

const stripDoctype = (html: string): string => html.replace(/<!DOCTYPE[^>]*>/gi, '')

const stripHtmlComments = (html: string): string => {
  let previous: string
  let current = html

  do {
    previous = current
    current = current.replace(/<!--[\s\S]*?-->/g, '')
  } while (current !== previous)

  return current
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  bull: '•',
  cent: '¢',
  copy: '©',
  deg: '°',
  divide: '÷',
  euro: '€',
  gt: '>',
  hellip: '…',
  laquo: '«',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  middot: '·',
  nbsp: ' ',
  ndash: '–',
  para: '¶',
  pound: '£',
  quot: '"',
  raquo: '»',
  rdquo: '”',
  reg: '®',
  rsquo: '’',
  sect: '§',
  shy: '',
  times: '×',
  trade: '™',
  yen: '¥',
  zwj: '',
  zwnj: '',
}

const ZERO_WIDTH_CODE_POINTS = new Set([0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0xfeff])

const ENTITY_PATTERN = /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi

const decodeHtmlEntities = (text: string): string =>
  text.replace(ENTITY_PATTERN, (entity, body: string) => {
    if (body[0] === '#') {
      const codePoint =
        body[1] === 'x' || body[1] === 'X'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10)

      if (Number.isNaN(codePoint) || codePoint > 0x10ffff) {
        return entity
      }

      if (codePoint === 0xa0) {
        return ' '
      }

      return ZERO_WIDTH_CODE_POINTS.has(codePoint) ? '' : String.fromCodePoint(codePoint)
    }

    return NAMED_ENTITIES[body.toLowerCase()] ?? entity
  })

const collapseWhitespace = (text: string): string => {
  return text
    .replace(/[\u200b-\u200f\ufeff]/g, '')
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
  const normalizedLabel = label.trim()

  if (linkFormat === 'href-only') {
    return href
  }

  if (linkFormat === 'text-only') {
    return normalizedLabel
  }

  return normalizedLabel === '' ? href : `${normalizedLabel} (${href})`
}

const formatImage = (attributes: string, includeImageAlt: boolean): string => {
  if (!includeImageAlt) {
    return ''
  }

  const altMatch = attributes.match(/\salt="([^"]*)"/i)
  return altMatch?.[1] ?? ''
}

export const renderPlainText = (html: string, options: PlainTextRenderOptions = {}): string => {
  const resolvedOptions = {
    ...DEFAULT_PLAIN_TEXT_RENDER_OPTIONS,
    ...options,
  }

  let text = stripHtmlComments(stripDoctype(html))

  let prev: string
  do {
    prev = text
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style(?:\s+[^>]*)?\s*>/gi, '')
  } while (text !== prev)
  do {
    prev = text
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script(?:\s+[^>]*)?\s*>/gi, '')
  } while (text !== prev)

  text = text.replace(/<hr\s*\/?>/gi, `\n${resolvedOptions.hrSeparator}\n`)
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/h[1-6]>/gi, '\n\n')
  text = text.replace(/<li[^>]*>/gi, `\n${resolvedOptions.listBullet} `)
  text = text.replace(/<\/li>/gi, '')
  text = text.replace(/<img\b([^>]*)\/?>/gi, (_match, attributes: string) =>
    formatImage(attributes, resolvedOptions.includeImageAlt),
  )
  text = text.replace(
    /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, label: string) => formatLink(label, href, resolvedOptions.linkFormat),
  )
  do {
    prev = text
    text = text.replace(/<[^>]+>/g, '')
  } while (text !== prev)

  const collapsed = collapseWhitespace(decodeHtmlEntities(text))

  if (resolvedOptions.headingStyle !== 'uppercase') {
    return collapsed
  }

  return collapsed.replace(/(^|\n)([^\n]+)(\n\n)/g, (match, start, line, end) => {
    if (/^[A-Za-z0-9 _-]+$/.test(line) && line === line.trim() && line.length <= 80) {
      return `${start}${line.toUpperCase()}${end}`
    }

    return match
  })
}
