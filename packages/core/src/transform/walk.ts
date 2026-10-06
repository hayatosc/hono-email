import { hasAttribute } from '../html-attribute'
import { tokenizeHtml } from '../html-tokenizer'

const PREVIEW_ATTRIBUTE = 'data-hono-email-preview'

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
  const rawTextTags = new Set([...skipTags].filter((tag) => !VOID_TAGS.has(tag)))
  let result = ''

  for (const token of tokenizeHtml(html, { rawTextTags })) {
    if (token.type === 'tag') {
      const tag = token.name
      if (token.closing) {
        const current = stack[stack.length - 1]
        result += transform(token.raw, {
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

      const parentSkipped = stack[stack.length - 1]?.skip ?? false
      const ownsSkipRegion =
        !parentSkipped &&
        (skipTags.has(tag) || hasAttribute(html.slice(token.nameEnd, token.end), PREVIEW_ATTRIBUTE))

      result += transform(token.raw, {
        type: 'tag',
        isSkipped: parentSkipped,
        isSkipBoundary: ownsSkipRegion,
      })

      if (!token.selfClosing && !VOID_TAGS.has(tag)) {
        stack.push({ tag, skip: parentSkipped || ownsSkipRegion, ownsSkipRegion })
      }
      continue
    }

    result += transform(token.raw, {
      type: token.type === 'declaration' ? 'tag' : token.type,
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
