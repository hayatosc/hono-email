// A private nonce prevents document content from forging a processed boundary.
const nonce =
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
const markerPrefix = `hono-email-tw-processed:${nonce}`
const startMarker = `<!--${markerPrefix}:start-->`
const endMarker = `<!--${markerPrefix}:end-->`
const processedPattern = new RegExp(`${startMarker}([\\s\\S]*?)${endMarker}`, 'g')
const slotPattern = new RegExp(`${markerPrefix}:slot:(\\d+):end`, 'g')

export const wrapProcessedTailwindHtml = (html: string): string =>
  `${startMarker}${html}${endMarker}`

/**
 * Temporarily replaces inner Tailwind output with text so the outer artifact
 * cannot validate or rewrite it. Restoring the original source also preserves
 * head styles, warning markers, and fragments inside tables without a wrapper tag.
 * Inner boundaries are consumed here; the caller wraps the completed outer output
 * in a single boundary, so processed ranges remain disjoint at every depth.
 */
export const protectProcessedTailwindHtml = (
  html: string,
): { html: string; restore: (transformedHtml: string) => string } => {
  const fragments: string[] = []
  const protectedHtml = html.replace(processedPattern, (_marker, fragment: string) => {
    const index = fragments.push(fragment) - 1
    // Text survives table fragments without closing a surrounding conditional comment.
    return `${markerPrefix}:slot:${index}:end`
  })

  return {
    html: protectedHtml,
    restore: (transformedHtml) =>
      transformedHtml.replace(
        slotPattern,
        (marker, index: string) => fragments[Number(index)] ?? marker,
      ),
  }
}

// Only the top-level render removes boundaries, after all Tailwind wrappers finish.
export const removeTailwindProcessedBoundaries = (html: string): string =>
  html.replaceAll(startMarker, '').replaceAll(endMarker, '')
