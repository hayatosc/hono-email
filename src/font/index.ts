import { raw } from 'hono/html'
import { createUnifont, providers, type FontFaceData, type FontStyles } from 'unifont'

const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'emoji',
  'math',
  'fangsong',
])

type SupportedProvider = 'google' | 'bunny' | 'fontsource' | 'npm'
type SupportedFormat = 'woff2' | 'woff' | 'otf' | 'ttf' | 'eot'

export type FontWebFont = {
  url: string
  format: 'woff' | 'woff2' | 'truetype' | 'opentype' | 'embedded-opentype' | 'svg'
}

export type FontSourceOptions = {
  familyOptions?: Record<string, unknown>
  provider?: SupportedProvider
  formats?: SupportedFormat[]
  providerOptions?: Record<string, unknown>
  styles?: FontStyles[]
  subsets?: string[]
  weights?: string[]
}

export type FontProps = {
  fallbackFontFamily: string | string[]
  fontFamily: string
  fontStyle?: FontStyles
  fontWeight?: number | string
  source?: FontSourceOptions
  webFont?: FontWebFont
}

type ResolvedFontResult = {
  fallbacks?: string[]
  fonts: FontFaceData[]
}

type UnifontInstance = {
  resolveFont: (
    fontFamily: string,
    options?: Record<string, unknown>
  ) => Promise<ResolvedFontResult>
}

const unifontCache = new Map<string, Promise<UnifontInstance>>()

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const cssEscapeString = (value: string): string => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const quoteFontFamily = (value: string): string =>
  GENERIC_FONT_FAMILIES.has(value.toLowerCase()) ? value : `'${cssEscapeString(value)}'`

const toFontFamilyList = (value: string | string[]): string[] => (Array.isArray(value) ? value : [value])

const serializeSrc = (sources: FontFaceData['src']): string =>
  sources
    .map((source) => {
      if ('name' in source) {
        return `local('${cssEscapeString(source.name)}')`
      }

      if (source.format) {
        return `url(${source.url}) format('${source.format}')`
      }

      return `url(${source.url})`
    })
    .join(', ')

const serializeOptionalDescriptor = (property: string, value: string | undefined): string =>
  value ? `${property}: ${value};` : ''

const serializeWeight = (weight: FontFaceData['weight']): string | undefined => {
  if (Array.isArray(weight)) {
    return `${weight[0]} ${weight[1]}`
  }

  if (weight === undefined) {
    return undefined
  }

  return `${weight}`
}

const serializeFontFace = (
  fontFamily: string,
  fallbackFontFamily: string[],
  fontFace: FontFaceData
): string => {
  const msoFontAlt = fallbackFontFamily[0]

  return [
    '@font-face {',
    `font-family: ${quoteFontFamily(fontFamily)};`,
    `src: ${serializeSrc(fontFace.src)};`,
    serializeOptionalDescriptor('font-display', fontFace.display),
    serializeOptionalDescriptor('font-style', fontFace.style),
    serializeOptionalDescriptor('font-weight', serializeWeight(fontFace.weight)),
    serializeOptionalDescriptor('font-stretch', fontFace.stretch),
    serializeOptionalDescriptor('font-feature-settings', fontFace.featureSettings),
    serializeOptionalDescriptor('font-variation-settings', fontFace.variationSettings),
    serializeOptionalDescriptor(
      'unicode-range',
      fontFace.unicodeRange && fontFace.unicodeRange.length > 0 ? fontFace.unicodeRange.join(', ') : undefined
    ),
    msoFontAlt ? `mso-font-alt: ${quoteFontFamily(msoFontAlt)};` : '',
    '}',
  ]
    .filter(Boolean)
    .join('')
}

const getProviderFactory = (providerName: SupportedProvider, providerOptions: Record<string, unknown> | undefined) => {
  switch (providerName) {
    case 'bunny':
      return providers.bunny()
    case 'fontsource':
      return providers.fontsource()
    case 'npm':
      return providers.npm(isRecord(providerOptions) ? providerOptions : undefined)
    case 'google':
    default:
      return providers.google(isRecord(providerOptions) ? providerOptions : undefined)
  }
}

const getUnifont = (
  providerName: SupportedProvider,
  providerOptions: Record<string, unknown> | undefined
): Promise<UnifontInstance> => {
  const cacheKey = JSON.stringify({
    providerName,
    providerOptions: providerOptions ?? {},
  })

  let cached = unifontCache.get(cacheKey)
  if (!cached) {
    cached = createUnifont([getProviderFactory(providerName, providerOptions)]) as Promise<UnifontInstance>
    unifontCache.set(cacheKey, cached)
  }

  return cached as Promise<UnifontInstance>
}

const renderGlobalFontRule = (fontFamily: string, fallbackFontFamily: string[]): string =>
  `* { font-family: ${[fontFamily, ...fallbackFontFamily].map(quoteFontFamily).join(', ')}; }`

const resolveSourceFonts = async (
  fontFamily: string,
  source: FontSourceOptions | undefined
): Promise<{ fallbacks?: string[]; fonts: FontFaceData[] }> => {
  if (!source) {
    return { fonts: [] }
  }

  const providerName = source.provider ?? 'google'
  const unifont = await getUnifont(providerName, source.providerOptions)
  const result = await unifont.resolveFont(fontFamily, {
    ...(source.formats ? { formats: source.formats } : {}),
    ...(source.styles ? { styles: source.styles } : {}),
    ...(source.subsets ? { subsets: source.subsets } : {}),
    ...(source.weights ? { weights: source.weights } : {}),
    ...(source.familyOptions
      ? {
          options: {
            [providerName]: source.familyOptions,
          },
        }
      : {}),
  })

  return result
}

export const renderFontStyle = async ({
  fallbackFontFamily,
  fontFamily,
  fontStyle = 'normal',
  fontWeight = 400,
  source,
  webFont,
}: FontProps): Promise<string> => {
  const explicitFallbacks = toFontFamilyList(fallbackFontFamily)
  let sourceResult: { fallbacks?: string[]; fonts: FontFaceData[] } = { fonts: [] }

  if (!webFont) {
    try {
      sourceResult = await resolveSourceFonts(fontFamily, source)
    } catch (error) {
      console.warn(`Failed to resolve remote font "${fontFamily}". Falling back to local font stack only.`, error)
    }
  }

  const fontFaces = webFont
    ? [
        {
          display: 'swap' as const,
          src: [{ format: webFont.format, url: webFont.url }],
          style: fontStyle,
          weight: fontWeight,
        },
      ]
    : sourceResult.fonts

  const resolvedFallbacks = webFont ? [] : sourceResult.fallbacks ?? []
  const mergedFallbacks = [...explicitFallbacks]

  for (const fallback of resolvedFallbacks) {
    if (!mergedFallbacks.includes(fallback)) {
      mergedFallbacks.push(fallback)
    }
  }

  const css = [
    ...fontFaces.map((fontFace) => serializeFontFace(fontFamily, mergedFallbacks, fontFace)),
    renderGlobalFontRule(fontFamily, mergedFallbacks),
  ].join('')

  return css
}

export const renderFontStyleTag = async (props: FontProps) => raw(`<style>${await renderFontStyle(props)}</style>`)
