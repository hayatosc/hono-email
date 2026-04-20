import { raw } from 'hono/html'

type FontStyle = 'italic' | 'normal' | 'oblique'
type FontWeight = 'bold' | 'bolder' | 'lighter' | 'normal' | number
type FontFormat = 'embedded-opentype' | 'opentype' | 'svg' | 'truetype' | 'woff' | 'woff2'

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

const quoteFontFamily = (family: string): string =>
  GENERIC_FAMILIES.has(family.toLowerCase())
    ? family
    : `'${family.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

export const renderFontStyleTag = ({
  fallbackFontFamily,
  fontFamily,
  fontStyle = 'normal',
  fontWeight = 400,
  webFont,
}: FontProps) => {
  const fallbacks = Array.isArray(fallbackFontFamily) ? fallbackFontFamily : [fallbackFontFamily]
  const familyList = [fontFamily, ...fallbacks].map(quoteFontFamily).join(', ')

  const fontFaceCss = webFont
    ? [
        '@font-face {',
        `font-family: ${quoteFontFamily(fontFamily)};`,
        `font-style: ${fontStyle};`,
        `font-weight: ${fontWeight};`,
        `mso-font-alt: ${quoteFontFamily(fallbacks[0] ?? 'Arial')};`,
        `src: url(${webFont.url}) format('${webFont.format}');`,
        '}',
      ].join('')
    : ''

  return raw(`<style>${fontFaceCss}* { font-family: ${familyList}; }</style>`)
}
