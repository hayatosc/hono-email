import { hasAttribute } from '../html-attribute'
import { tokenizeHtml } from '../html-tokenizer'

const SKIP_TAGS = new Set(['pre', 'code', 'style', 'script', 'head', 'title', 'textarea'])
const BLOCK_TAGS = new Set([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'td',
  'th',
  'blockquote',
  'article',
  'section',
  'header',
  'footer',
  'main',
  'aside',
  'ol',
  'ul',
  'tr',
  'table',
  'tbody',
  'thead',
  'tfoot',
  'br',
  'hr',
])

const INCOMPLETE_MARKUP_PATTERN = /^<(?:\/?[a-z]|[!?])/i

/**
 * Prevents widows by joining the last two words of each text block with `&nbsp;`.
 *
 * Text inside `pre`, `code`, `style`, `script`, `head`, `title`, `textarea`, and
 * the hidden preview block is left untouched. This implementation traverses inline tags
 * (like <b>, <a>, etc.) to ensure that text blocks ending with styled elements are also guarded.
 *
 * @param html - HTML to process.
 * @returns HTML with non-breaking spaces inserted before trailing words.
 */
export const preventWidows = (html: string): string => {
  const sourceTokens = [...tokenizeHtml(html)]
  const tokens = sourceTokens.map((token) => token.raw)
  const stack: { tag: string; skip: boolean }[] = []

  type ActiveText = {
    tokenIndex: number
    text: string
  }
  let activeTextNodes: ActiveText[] = []

  const flush = () => {
    if (activeTextNodes.length === 0) return

    const combined = activeTextNodes.map((n) => n.text).join('')

    // Find the last space before the last word
    let lastNonSpaceIndex = -1
    for (let i = combined.length - 1; i >= 0; i--) {
      if (/\S/.test(combined.charAt(i))) {
        lastNonSpaceIndex = i
        break
      }
    }

    let targetSpaceIndex = -1
    if (lastNonSpaceIndex !== -1) {
      for (let i = lastNonSpaceIndex - 1; i >= 0; i--) {
        if (/\s/.test(combined.charAt(i))) {
          targetSpaceIndex = i
          break
        }
      }
    }

    if (targetSpaceIndex !== -1) {
      let accumulatedLength = 0
      for (const node of activeTextNodes) {
        const nodeStart = accumulatedLength
        const nodeEnd = accumulatedLength + node.text.length
        if (targetSpaceIndex >= nodeStart && targetSpaceIndex < nodeEnd) {
          const localIndex = targetSpaceIndex - nodeStart
          const before = node.text.slice(0, localIndex)
          const after = node.text.slice(localIndex + 1)
          tokens[node.tokenIndex] = `${before}&nbsp;${after}`
          break
        }
        accumulatedLength = nodeEnd
      }
    }

    activeTextNodes = []
  }

  for (const [i, token] of sourceTokens.entries()) {
    if (token.type === 'tag') {
      const tag = token.name
      if (token.closing) {
        // Block tags or skip tags will flush active text nodes
        if (BLOCK_TAGS.has(tag) || SKIP_TAGS.has(tag)) {
          flush()
        }

        for (let index = stack.length - 1; index >= 0; index -= 1) {
          if (stack[index]?.tag === tag) {
            stack.length = index
            break
          }
        }
        continue
      }

      if (BLOCK_TAGS.has(tag) || SKIP_TAGS.has(tag)) {
        flush()
      }

      if (!token.selfClosing) {
        const skip =
          (stack[stack.length - 1]?.skip ?? false) ||
          SKIP_TAGS.has(tag) ||
          hasAttribute(html.slice(token.nameEnd, token.end - 1), 'data-hono-email-preview')
        stack.push({ tag, skip })
      }
      continue
    }

    if (token.type !== 'text') continue

    // It's a text token
    const isSkipped = stack[stack.length - 1]?.skip ?? false
    if (isSkipped || INCOMPLETE_MARKUP_PATTERN.test(token.raw)) {
      flush()
    } else {
      activeTextNodes.push({ tokenIndex: i, text: token.raw })
    }
  }

  flush() // Flush any remaining text nodes at the end

  return tokens.join('')
}
