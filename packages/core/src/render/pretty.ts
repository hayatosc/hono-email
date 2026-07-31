import { transformHtmlOutsideSkips } from '../transform/walk'

const SKIP_TAGS = new Set(['pre', 'code', 'style', 'script', 'textarea'])
const SKIPPED_TOKEN_PATTERN = /__hono_email_pretty_skip_\d+__/g

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

const tokenizeHtml = (html: string): string[] => {
  return html
    .replace(/></g, '>\n<')
    .split('\n')
    .map((token) => token.trim())
    .filter(Boolean)
}

const protectSkippedContent = (
  html: string,
): { html: string; placeholders: Map<string, string> } => {
  const placeholders = new Map<string, string>()
  let nextPlaceholderIndex = 0

  const protectedHtml = transformHtmlOutsideSkips(html, {
    skipTags: SKIP_TAGS,
    transform: (token, context) => {
      if (context.type !== 'comment' && (!context.isSkipped || context.isSkipBoundary)) {
        return token
      }

      let marker: string
      do {
        marker = `__hono_email_pretty_skip_${nextPlaceholderIndex}__`
        nextPlaceholderIndex += 1
      } while (html.includes(marker) || placeholders.has(marker))

      placeholders.set(marker, token)
      return marker
    },
  })

  return { html: protectedHtml, placeholders }
}

const isClosingTag = (token: string): boolean => token.startsWith('</')

const isSelfClosingTag = (token: string): boolean => token.endsWith('/>')

const isOpeningTag = (token: string): boolean =>
  /^<[^!/][^>]*>$/.test(token) && !isClosingTag(token) && !isSelfClosingTag(token)

const isVoidTag = (token: string): boolean => {
  const tagName = token.match(/^<([a-z0-9-]+)/i)?.[1]?.toLowerCase()
  return tagName ? VOID_TAGS.has(tagName) : false
}

export const prettyPrintHtml = (html: string): string => {
  const protectedContent = protectSkippedContent(html)
  const tokens = tokenizeHtml(protectedContent.html)
  let depth = 0

  return tokens
    .map((token) => {
      if (isClosingTag(token)) {
        depth = Math.max(0, depth - 1)
      }

      const line = `${'  '.repeat(depth)}${token}`

      if (isOpeningTag(token) && !isVoidTag(token)) {
        depth += 1
      }

      return line
    })
    .join('\n')
    .replace(SKIPPED_TOKEN_PATTERN, (marker) => protectedContent.placeholders.get(marker) ?? marker)
}
