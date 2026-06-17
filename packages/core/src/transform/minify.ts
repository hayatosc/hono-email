import { transformTextOutsideSkips } from './walk'

const SKIP_TAGS = new Set(['pre', 'code', 'style', 'script', 'textarea'])

const WHITESPACE_RUN_PATTERN = /\s+/g

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
