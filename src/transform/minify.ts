import { transformTextOutsideSkips } from './walk'

const SKIP_TAGS = new Set(['pre', 'code', 'style', 'script', 'textarea'])

const WHITESPACE_RUN_PATTERN = /\s+/g

// Collapse every whitespace run to a single space. Whitespace-only nodes also
// become a single space rather than being removed, so significant spacing
// between inline elements (e.g. `<span>a</span> <span>b</span>`) is preserved.
// Whitespace between block/table elements is insignificant, so a single space
// is safe there too.
const collapseWhitespace = (text: string): string => text.replace(WHITESPACE_RUN_PATTERN, ' ')

/**
 * Minifies HTML by collapsing insignificant whitespace.
 *
 * Whitespace runs in text nodes are collapsed to a single space. Content inside
 * `pre`, `code`, `style`, `script`, `textarea`, conditional comments, and the
 * preview block is preserved.
 *
 * @param html - HTML to minify.
 * @returns Minified HTML.
 */
export const minifyHtml = (html: string): string =>
  transformTextOutsideSkips(html, { skipTags: SKIP_TAGS, transform: collapseWhitespace })
