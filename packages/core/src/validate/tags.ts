import { tokenizeHtml } from '../html-tokenizer'

const ATTRIBUTE_PATTERN = /([^\s"'=<>`/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gi
const TAG_NAME_PATTERN = /^[a-z][a-z0-9-]*/i
const INCOMPLETE_MARKUP_PATTERN = /^<(?:\/?[a-z]|[!?])/i
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'title'])

export type OpeningTag = {
  attributes: Map<string, string | undefined>
  endIndex: number
  index: number
  name: string
}

export const stripHtmlComments = (html: string): string => {
  let result = ''
  for (const token of tokenizeHtml(html)) {
    if (token.type !== 'comment') result += token.raw
  }
  return result
}

const parseAttributes = (attributesText: string): Map<string, string | undefined> => {
  const attributes = new Map<string, string | undefined>()

  for (const match of attributesText.matchAll(ATTRIBUTE_PATTERN)) {
    const attributeName = match[1]?.toLowerCase()

    if (!attributeName) {
      continue
    }

    const attributeValue = match[2] ?? match[3] ?? match[4]
    attributes.set(attributeName, attributeValue)
  }

  return attributes
}

export const collectOpeningTags = (html: string): OpeningTag[] => {
  const tags: OpeningTag[] = []
  let inRawText = false

  for (const token of tokenizeHtml(html)) {
    if (token.type !== 'tag') {
      // Incomplete markup must not conceal tags or attributes from strict validation.
      if (token.type === 'text' && !inRawText && INCOMPLETE_MARKUP_PATTERN.test(token.raw)) {
        throw new Error('Malformed HTML tags are not allowed in HTML email strict mode.')
      }
      continue
    }

    if (token.name.includes('<')) {
      throw new Error('Malformed HTML tags are not allowed in HTML email strict mode.')
    }
    inRawText = !token.closing && !token.selfClosing && RAW_TEXT_TAGS.has(token.name)
    if (token.closing) continue

    // Preserve the legacy name boundary and attribute parser, including blocked tag prefixes.
    const name = token.name.match(TAG_NAME_PATTERN)?.[0] ?? token.name
    tags.push({
      attributes: parseAttributes(html.slice(token.start + 1 + name.length, token.end - 1)),
      endIndex: token.end,
      index: token.start,
      name,
    })
  }

  return tags
}

const CONDITIONAL_COMMENT_OPEN_PATTERN = /^\s*\[if\b[^\]]*\]>/i
const CONDITIONAL_COMMENT_CLOSE_PATTERN = /<!\s*\[endif\]\s*$/i

export const extractConditionalCommentPayloads = (html: string): string[] => {
  const payloads: string[] = []
  const sources = [html]

  for (let index = 0; index < sources.length; index += 1) {
    for (const token of tokenizeHtml(sources[index] ?? '')) {
      if (token.type !== 'comment') continue

      const content = token.raw.slice('<!--'.length, token.raw.endsWith('-->') ? -3 : undefined)
      const openMatch = content.match(CONDITIONAL_COMMENT_OPEN_PATTERN)
      if (!openMatch) continue

      const closeMatch = content.match(CONDITIONAL_COMMENT_CLOSE_PATTERN)
      const payload = content.slice(openMatch[0].length, closeMatch?.index).trim()
      // Revealed conditionals have an empty opener followed by ordinary visible HTML.
      if (payload === '' || (payload === '<!' && token.raw.endsWith('<!-->'))) continue

      payloads.push(payload)
      // Nested or incompletely closed conditionals still need the full validation pipeline.
      sources.push(payload)
    }
  }

  return payloads
}
