import { hasAttribute } from '../html-attribute'

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
  ownsSkipRegion: boolean
}

export type HtmlTokenContext = {
  type: 'comment' | 'tag' | 'text'
  isSkipped: boolean
  isSkipBoundary: boolean
}

export type HtmlWalkOptions = {
  skipTags: Set<string>
  transform: (token: string, context: HtmlTokenContext) => string
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
export const transformHtmlOutsideSkips = (html: string, options: HtmlWalkOptions): string => {
  const { skipTags, transform } = options
  const stack: OpenElement[] = []
  const tokenPattern = new RegExp(TOKEN_PATTERN)
  let result = ''
  let cursor = 0

  while (cursor < html.length) {
    const current = stack[stack.length - 1]
    if (current?.skip && skipTags.has(current.tag)) {
      const closingTagPattern = new RegExp(`</${current.tag}\\b[^>]*>`, 'i')
      const closingTagMatch = closingTagPattern.exec(html.slice(cursor))

      if (!closingTagMatch) {
        result += transform(html.slice(cursor), {
          type: 'text',
          isSkipped: true,
          isSkipBoundary: false,
        })
        break
      }

      if (closingTagMatch.index > 0) {
        result += transform(html.slice(cursor, cursor + closingTagMatch.index), {
          type: 'text',
          isSkipped: true,
          isSkipBoundary: false,
        })
        cursor += closingTagMatch.index
      }
    }

    tokenPattern.lastIndex = cursor
    const match = tokenPattern.exec(html)
    if (!match) {
      result += transform(html.slice(cursor), {
        type: 'text',
        isSkipped: current?.skip ?? false,
        isSkipBoundary: false,
      })
      break
    }

    const token = match[0]
    cursor = tokenPattern.lastIndex

    if (token.startsWith('<!--') || token.startsWith('<')) {
      const closeMatch = /^<\/([a-zA-Z0-9-]+)/.exec(token)
      if (closeMatch) {
        const tag = closeMatch[1]?.toLowerCase()
        const current = stack[stack.length - 1]
        result += transform(token, {
          type: 'tag',
          isSkipped: current?.skip ?? false,
          isSkipBoundary: current?.tag === tag && (current?.ownsSkipRegion ?? false),
        })

        for (let index = stack.length - 1; index >= 0; index -= 1) {
          if (stack[index]?.tag === tag) {
            stack.length = index
            break
          }
        }
        continue
      }

      const openMatch = /^<([a-zA-Z0-9-]+)/.exec(token)
      if (openMatch) {
        const tag = openMatch[1]?.toLowerCase() ?? ''
        const selfClosing = token.endsWith('/>')
        const parentSkipped = stack[stack.length - 1]?.skip ?? false
        const ownsSkipRegion =
          !parentSkipped &&
          (skipTags.has(tag) || hasAttribute(token.slice(openMatch[0].length), PREVIEW_ATTRIBUTE))

        result += transform(token, {
          type: 'tag',
          isSkipped: parentSkipped,
          isSkipBoundary: ownsSkipRegion,
        })

        if (!selfClosing && !VOID_TAGS.has(tag)) {
          stack.push({ tag, skip: parentSkipped || ownsSkipRegion, ownsSkipRegion })
        }
      }

      if (!openMatch) {
        result += transform(token, {
          type: token.startsWith('<!--') ? 'comment' : 'tag',
          isSkipped: stack[stack.length - 1]?.skip ?? false,
          isSkipBoundary: false,
        })
      }
      continue
    }

    result += transform(token, {
      type: 'text',
      isSkipped: stack[stack.length - 1]?.skip ?? false,
      isSkipBoundary: false,
    })
  }

  return result
}

export const transformTextOutsideSkips = (html: string, options: TextWalkOptions): string =>
  transformHtmlOutsideSkips(html, {
    skipTags: options.skipTags,
    transform: (token, context) =>
      context.type === 'text' && !context.isSkipped ? options.transform(token) : token,
  })
