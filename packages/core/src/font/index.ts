import { raw } from 'hono/html'

type FontStyle = 'italic' | 'normal' | 'oblique'
type FontWeight = 'bold' | 'bolder' | 'lighter' | 'normal' | number
type FontFormat = 'embedded-opentype' | 'opentype' | 'svg' | 'truetype' | 'woff' | 'woff2'

/**
 * Options for rendering a web font declaration and fallback font family.
 *
 * @property fontFamily - Primary font-family name.
 * @property fallbackFontFamily - Fallback family or families appended after `fontFamily`.
 * @property fontStyle - Optional CSS font style.
 * @property fontWeight - Optional CSS font weight.
 * @property webFont - Optional remote web font source.
 *
 * @example
 * ```tsx
 * <Font
 *   fallbackFontFamily={['Arial', 'sans-serif']}
 *   fontFamily="Inter"
 *   fontWeight={400}
 *   webFont={{ url: 'https://example.com/inter.woff2', format: 'woff2' }}
 * />
 * ```
 */
export type FontProps = {
  fallbackFontFamily: string | string[]
  fontFamily: string
  fontStyle?: FontStyle
  fontWeight?: FontWeight
  webFont?: {
    format: FontFormat
    url: string
  }
}

const GENERIC_FAMILIES = new Set([
  'cursive',
  'emoji',
  'fangsong',
  'fantasy',
  'math',
  'monospace',
  'sans-serif',
  'serif',
  'system-ui',
  'ui-monospace',
  'ui-sans-serif',
  'ui-serif',
])
const FONT_FORMATS = new Set<FontFormat>([
  'embedded-opentype',
  'opentype',
  'svg',
  'truetype',
  'woff',
  'woff2',
])
const FONT_STYLES = new Set<FontStyle>(['italic', 'normal', 'oblique'])
const FONT_WEIGHT_KEYWORDS = new Set(['bold', 'bolder', 'lighter', 'normal'])

const escapeCssString = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r\n|\r|\n|\f/g, '\\A ')
    .replace(/</g, '\\3C ')
    .replace(/>/g, '\\3E ')

const quoteFontFamily = (family: string): string =>
  GENERIC_FAMILIES.has(family.toLowerCase()) ? family : `'${escapeCssString(family)}'`

const quoteCssUrl = (url: string): string => `url('${escapeCssString(url)}')`

const normalizeFontStyle = (fontStyle: FontStyle): FontStyle => {
  if (!FONT_STYLES.has(fontStyle)) {
    throw new Error('Invalid Font fontStyle.')
  }

  return fontStyle
}

const normalizeFontWeight = (fontWeight: FontWeight): string => {
  if (typeof fontWeight === 'number') {
    if (!Number.isFinite(fontWeight)) {
      throw new Error('Invalid Font fontWeight.')
    }

    return String(fontWeight)
  }

  if (!FONT_WEIGHT_KEYWORDS.has(fontWeight)) {
    throw new Error('Invalid Font fontWeight.')
  }

  return fontWeight
}

const normalizeFontFormat = (format: FontFormat): FontFormat => {
  if (!FONT_FORMATS.has(format)) {
    throw new Error('Invalid Font webFont format.')
  }

  return format
}

export const renderFontStyleTag = ({
  fallbackFontFamily,
  fontFamily,
  fontStyle = 'normal',
  fontWeight = 400,
  webFont,
}: FontProps) => {
  const fallbacks = Array.isArray(fallbackFontFamily) ? fallbackFontFamily : [fallbackFontFamily]
  const familyList = [fontFamily, ...fallbacks].map(quoteFontFamily).join(', ')
  const safeFontStyle = normalizeFontStyle(fontStyle)
  const safeFontWeight = normalizeFontWeight(fontWeight)

  const fontFaceCss = webFont
    ? [
        '@font-face {',
        `font-family: ${quoteFontFamily(fontFamily)};`,
        `font-style: ${safeFontStyle};`,
        `font-weight: ${safeFontWeight};`,
        `mso-font-alt: ${quoteFontFamily(fallbacks[0] ?? 'Arial')};`,
        `src: ${quoteCssUrl(webFont.url)} format('${normalizeFontFormat(webFont.format)}');`,
        '}',
      ].join('')
    : ''

  return raw(
    `<style data-hono-email-head="true">${fontFaceCss}* { font-family: ${familyList}; }</style>`,
  )
}
