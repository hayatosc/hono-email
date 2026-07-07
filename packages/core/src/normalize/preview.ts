const TOKEN_PATTERN = /<!--[\s\S]*?-->|<[^>]+>|[^<]+/g
const BODY_OPENING_TAG_PATTERN = /<body\b[^>]*>/i

export const relocatePreview = (html: string): string => {
  const bodyMatch = html.match(BODY_OPENING_TAG_PATTERN)
  if (!bodyMatch || !bodyMatch[0]) {
    return html
  }
  const bodyTag = bodyMatch[0]

  let previewBlock = ''
  let insidePreview = false
  let previewDepth = 0
  let withoutPreview = ''

  for (const match of html.matchAll(TOKEN_PATTERN)) {
    const token = match[0]

    if (insidePreview) {
      previewBlock += token
      if (token.startsWith('<')) {
        const closeMatch = /^<\/([a-zA-Z0-9-]+)/.exec(token)
        if (closeMatch) {
          const tag = closeMatch[1]?.toLowerCase()
          if (tag === 'div') {
            previewDepth -= 1
            if (previewDepth === 0) {
              insidePreview = false
            }
          }
        } else {
          const openMatch = /^<([a-zA-Z0-9-]+)/.exec(token)
          if (openMatch) {
            const tag = openMatch[1]?.toLowerCase()
            const selfClosing = token.endsWith('/>')
            if (tag === 'div' && !selfClosing) {
              previewDepth += 1
            }
          }
        }
      }
    } else {
      if (token.startsWith('<') && !token.startsWith('</')) {
        if (/<div\b[^>]*data-hono-email-preview="true"/i.test(token)) {
          const selfClosing = token.endsWith('/>')
          if (selfClosing) {
            previewBlock = token
          } else {
            insidePreview = true
            previewDepth = 1
            previewBlock += token
          }
          continue
        }
      }
      withoutPreview += token
    }
  }

  if (!previewBlock) {
    return html
  }

  return withoutPreview.replace(bodyTag, `${bodyTag}${previewBlock}`)
}
