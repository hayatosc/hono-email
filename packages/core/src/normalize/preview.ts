import { readAttribute } from '../html-attribute'
import { tokenizeHtml } from '../html-tokenizer'

export const relocatePreview = (html: string): string => {
  let bodyInsertionIndex: number | undefined
  let previewBlock = ''
  let insidePreview = false
  let previewDepth = 0
  let withoutPreview = ''

  for (const token of tokenizeHtml(html)) {
    if (insidePreview) {
      previewBlock += token.raw
      if (token.type === 'tag' && token.name === 'div') {
        if (token.closing) {
          previewDepth -= 1
          if (previewDepth === 0) insidePreview = false
        } else if (!token.selfClosing) {
          previewDepth += 1
        }
      }
      continue
    }

    if (token.type === 'tag' && !token.closing) {
      if (
        token.name === 'div' &&
        readAttribute(html.slice(token.nameEnd, token.end - 1), 'data-hono-email-preview') ===
          'true'
      ) {
        previewBlock += token.raw
        insidePreview = !token.selfClosing
        previewDepth = insidePreview ? 1 : 0
        continue
      }
      if (token.name === 'body' && bodyInsertionIndex === undefined) {
        bodyInsertionIndex = withoutPreview.length + token.raw.length
      }
    }
    withoutPreview += token.raw
  }

  if (!previewBlock || bodyInsertionIndex === undefined || insidePreview) {
    return html
  }

  return `${withoutPreview.slice(0, bodyInsertionIndex)}${previewBlock}${withoutPreview.slice(bodyInsertionIndex)}`
}
