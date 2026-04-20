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

const isClosingTag = (token: string): boolean => token.startsWith('</')

const isOpeningTag = (token: string): boolean =>
  /^<[^!/][^>]*>$/.test(token) && !isClosingTag(token) && !token.endsWith('/>')

const isVoidTag = (token: string): boolean => {
  const tagName = token.match(/^<([a-z0-9-]+)/i)?.[1]?.toLowerCase()
  return tagName ? VOID_TAGS.has(tagName) : false
}

export const prettyPrintHtml = (html: string): string => {
  const tokens = tokenizeHtml(html)
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
}
