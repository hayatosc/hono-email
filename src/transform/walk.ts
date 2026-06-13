const PREVIEW_ATTRIBUTE = 'data-hono-email-preview'

const TOKEN_PATTERN = /<!--[\s\S]*?-->|<[^>]+>|[^<]+/g

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

/**
 * Options for {@link transformTextOutsideSkips}.
 *
 * @property skipTags - Tag names whose text content is left untouched.
 * @property transform - Applied to each text node outside skip regions.
 */
export type TextWalkOptions = {
  skipTags: Set<string>
  transform: (text: string) => string
}

type OpenElement = {
  tag: string
  skip: boolean
}

/**
 * Walks HTML text nodes, applying `transform` only to text outside skip regions.
 *
 * Tags and comments are passed through unchanged. Skip regions are entered for
 * `skipTags` and for the hidden preview block, tracked through a tag stack so the
 * whole subtree is excluded.
 *
 * @param html - HTML to walk.
 * @param options - Skip tags and the text transform.
 * @returns HTML with text nodes transformed outside skip regions.
 */
export const transformTextOutsideSkips = (html: string, options: TextWalkOptions): string => {
  const { skipTags, transform } = options
  const stack: OpenElement[] = []
  let result = ''

  for (const match of html.matchAll(TOKEN_PATTERN)) {
    const token = match[0]

    if (token.startsWith('<!--') || token.startsWith('<')) {
      const closeMatch = /^<\/([a-zA-Z0-9-]+)/.exec(token)
      if (closeMatch) {
        const tag = closeMatch[1]?.toLowerCase()
        for (let index = stack.length - 1; index >= 0; index -= 1) {
          if (stack[index]?.tag === tag) {
            stack.length = index
            break
          }
        }
        result += token
        continue
      }

      const openMatch = /^<([a-zA-Z0-9-]+)/.exec(token)
      if (openMatch) {
        const tag = openMatch[1]?.toLowerCase() ?? ''
        const selfClosing = token.endsWith('/>')
        if (!selfClosing && !VOID_TAGS.has(tag)) {
          const skip =
            (stack[stack.length - 1]?.skip ?? false) ||
            skipTags.has(tag) ||
            token.includes(PREVIEW_ATTRIBUTE)
          stack.push({ tag, skip })
        }
      }

      result += token
      continue
    }

    result += stack[stack.length - 1]?.skip ? token : transform(token)
  }

  return result
}
