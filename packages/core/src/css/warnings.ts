/** Keeps the existing warning text shared by Tailwind and hono/css rendering. */
export const formatDroppedClassWarning = (classToken: string): string =>
  `Tailwind class '${classToken}' uses an unsupported selector (combinator or pseudo-element) and was dropped.`

const TAILWIND_WARNING_COMMENT_PREFIX = 'hono-email-tw-warning:'

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const createTailwindWarningNonce = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}`

const TAILWIND_WARNING_NONCE = createTailwindWarningNonce()
const TAILWIND_WARNING_COMMENT_PATTERN = new RegExp(
  `<!--${escapeRegExp(TAILWIND_WARNING_COMMENT_PREFIX)}${escapeRegExp(TAILWIND_WARNING_NONCE)}:([\\s\\S]*?)-->`,
  'g',
)

/**
 * Encodes CSS render warnings as HTML comment markers.
 *
 * Markers travel with the rendered fragment until `render()` extracts them, so
 * warnings raised during CSS inlining reach the render pipeline.
 * Every marker carries a process-wide nonce, so document content cannot forge
 * or consume markers.
 *
 * @param warnings - Warning messages to encode.
 * @returns Concatenated comment markers, or an empty string.
 */
export const encodeCssWarnings = (warnings: string[]): string => {
  if (warnings.length === 0) {
    return ''
  }

  return warnings
    .map(
      (warning) =>
        `<!--${TAILWIND_WARNING_COMMENT_PREFIX}${TAILWIND_WARNING_NONCE}:${encodeURIComponent(warning)}-->`,
    )
    .join('')
}

/**
 * Extracts and removes CSS warning markers from HTML.
 *
 * @param html - HTML that may contain warning markers.
 * @returns The HTML without markers and the decoded warnings.
 */
export const extractCssWarnings = (html: string): { html: string; warnings: string[] } => {
  const warnings: string[] = []
  const stripped = html.replace(TAILWIND_WARNING_COMMENT_PATTERN, (_marker, encoded: string) => {
    warnings.push(decodeURIComponent(encoded))
    return ''
  })
  return { html: stripped, warnings }
}
