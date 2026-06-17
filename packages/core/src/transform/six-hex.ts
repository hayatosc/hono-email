const SHORT_HEX_OR_URL_PATTERN =
  /url\([^)]*\)|#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])(?![0-9a-fA-F])/gi
const STYLE_BLOCK_PATTERN = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi
const STYLE_ATTRIBUTE_PATTERN = /(\bstyle=)("[^"]*"|'[^']*')/gi

/**
 * Expands three-digit hex colors to six digits within a CSS string.
 *
 * `url(...)` tokens are skipped so URL hash fragments are not mistaken for hex
 * colors.
 *
 * @param css - CSS text to process.
 * @returns CSS with `#abc` rewritten to `#aabbcc`.
 */
export const expandShortHex = (css: string): string =>
  css.replace(SHORT_HEX_OR_URL_PATTERN, (match, red, green, blue) =>
    red ? `#${red}${red}${green}${green}${blue}${blue}` : match,
  )

/**
 * Rewrites three-digit hex colors to six digits, scoped to CSS contexts.
 *
 * Only `<style>` blocks and `style` attributes are processed so non-CSS hex
 * tokens such as `href="#abc"` are left untouched.
 *
 * @param html - HTML to process.
 * @returns HTML with short hex colors expanded inside CSS.
 */
export const ensureSixHex = (html: string): string =>
  html
    .replace(
      STYLE_BLOCK_PATTERN,
      (_match, open, css, close) => `${open}${expandShortHex(css)}${close}`,
    )
    .replace(STYLE_ATTRIBUTE_PATTERN, (_match, key, quoted) => {
      const quote = quoted[0]
      const value = quoted.slice(1, -1)
      return `${key}${quote}${expandShortHex(value)}${quote}`
    })
