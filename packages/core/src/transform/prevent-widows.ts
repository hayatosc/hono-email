import { transformTextOutsideSkips } from './walk'

const SKIP_TAGS = new Set(['pre', 'code', 'style', 'script', 'head', 'title', 'textarea'])

const TRAILING_PAIR_PATTERN = /(\S)\s+(\S+)(\s*)$/

const insertWidowGuard = (text: string): string =>
  text.replace(
    TRAILING_PAIR_PATTERN,
    (_match, before, lastWord, trailing) => `${before}&nbsp;${lastWord}${trailing}`,
  )

/**
 * Prevents widows by joining the last two words of each text node with `&nbsp;`.
 *
 * Text inside `pre`, `code`, `style`, `script`, `head`, `title`, `textarea`, and
 * the hidden preview block is left untouched.
 *
 * @param html - HTML to process.
 * @returns HTML with non-breaking spaces inserted before trailing words.
 */
export const preventWidows = (html: string): string =>
  transformTextOutsideSkips(html, { skipTags: SKIP_TAGS, transform: insertWidowGuard })
