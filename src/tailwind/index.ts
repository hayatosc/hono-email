import { parse } from 'node-html-parser'

import { mergeStyleAttributes, serializeStyleAttribute } from '../style'

type TailwindScalar = string | number
interface TailwindColors {
  [key: string]: TailwindScalar | TailwindColors
}

type TailwindTheme = {
  colors?: TailwindColors
  fontFamily?: Record<string, string | string[]>
  fontSize?: Record<string, string | [string, { lineHeight?: string | number }]>
  screens?: Record<string, string>
  spacing?: Record<string, string>
  extend?: TailwindTheme
}

export type TailwindConfig = {
  presets?: TailwindConfig[]
  theme?: TailwindTheme
}

type ResolvedTheme = {
  colors: TailwindColors
  fontFamily: Record<string, string>
  fontSize: Record<string, { fontSize: string; lineHeight?: string }>
  screens: Record<string, string>
  spacing: Record<string, string>
}

type TailwindRenderResult = {
  html: string
  headCss: string
}

const DEFAULT_COLORS: TailwindColors = {
  black: '#000000',
  white: '#ffffff',
  blue: {
    500: '#3b82f6',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
}

const DEFAULT_FONT_FAMILY = {
  mono: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
  sans: 'ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  serif: 'ui-serif,Georgia,Cambria,"Times New Roman",Times,serif',
}

const DEFAULT_FONT_SIZE = {
  xs: { fontSize: '12px', lineHeight: '16px' },
  sm: { fontSize: '14px', lineHeight: '20px' },
  base: { fontSize: '16px', lineHeight: '24px' },
  lg: { fontSize: '18px', lineHeight: '28px' },
  xl: { fontSize: '20px', lineHeight: '28px' },
  '2xl': { fontSize: '24px', lineHeight: '32px' },
  '3xl': { fontSize: '30px', lineHeight: '36px' },
  '4xl': { fontSize: '36px', lineHeight: '36px' },
  '5xl': { fontSize: '48px', lineHeight: '1' },
  '6xl': { fontSize: '60px', lineHeight: '1' },
  '7xl': { fontSize: '72px', lineHeight: '1' },
  '8xl': { fontSize: '96px', lineHeight: '1' },
  '9xl': { fontSize: '144px', lineHeight: '1' },
}

const DEFAULT_SCREENS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
}

const DEFAULT_SPACING = {
  '0': '0px',
  '0.5': '2px',
  '1': '4px',
  '1.5': '6px',
  '2': '8px',
  '2.5': '10px',
  '3': '12px',
  '3.5': '14px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '28px',
  '8': '32px',
  '9': '36px',
  '10': '40px',
  '11': '44px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
  '28': '112px',
  '32': '128px',
  '36': '144px',
  '40': '160px',
  '44': '176px',
  '48': '192px',
  '52': '208px',
  '56': '224px',
  '60': '240px',
  '64': '256px',
  '72': '288px',
  '80': '320px',
  '96': '384px',
}

export const pixelBasedPreset: TailwindConfig = {
  theme: {
    extend: {
      fontSize: Object.fromEntries(
        Object.entries(DEFAULT_FONT_SIZE).map(([key, value]) => [key, [value.fontSize, { lineHeight: value.lineHeight }]])
      ),
      spacing: DEFAULT_SPACING,
    },
  },
}

const mergeColors = (base: TailwindColors, extension?: TailwindColors): TailwindColors => {
  if (!extension) {
    return { ...base }
  }

  const result: TailwindColors = { ...base }

  for (const [key, value] of Object.entries(extension)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const current = result[key]
      result[key] = mergeColors(typeof current === 'object' && current !== null ? current : {}, value)
    } else {
      result[key] = value
    }
  }

  return result
}

const normalizeFontSizeRecord = (
  record?: Record<string, string | [string, { lineHeight?: string | number }]>
): Record<string, { fontSize: string; lineHeight?: string }> => {
  if (!record) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (Array.isArray(value)) {
        return [
          key,
          {
            fontSize: value[0],
            ...(value[1]?.lineHeight !== undefined ? { lineHeight: `${value[1].lineHeight}` } : {}),
          },
        ]
      }

      return [key, { fontSize: value }]
    })
  )
}

const mergeTheme = (base: ResolvedTheme, theme?: TailwindTheme): ResolvedTheme => {
  if (!theme) {
    return base
  }

  const extended = theme.extend

  return {
    colors: mergeColors(mergeColors(base.colors, theme.colors), extended?.colors),
    fontFamily: {
      ...base.fontFamily,
      ...Object.fromEntries(
        Object.entries({ ...theme.fontFamily, ...extended?.fontFamily }).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.join(',') : value,
        ])
      ),
    },
    fontSize: {
      ...base.fontSize,
      ...normalizeFontSizeRecord(theme.fontSize),
      ...normalizeFontSizeRecord(extended?.fontSize),
    },
    screens: {
      ...base.screens,
      ...theme.screens,
      ...extended?.screens,
    },
    spacing: {
      ...base.spacing,
      ...theme.spacing,
      ...extended?.spacing,
    },
  }
}

const resolveTheme = (config?: TailwindConfig): ResolvedTheme => {
  let theme: ResolvedTheme = {
    colors: DEFAULT_COLORS,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: DEFAULT_FONT_SIZE,
    screens: DEFAULT_SCREENS,
    spacing: DEFAULT_SPACING,
  }

  for (const preset of config?.presets ?? []) {
    theme = mergeTheme(theme, preset.theme)
  }

  return mergeTheme(theme, config?.theme)
}

const escapeSelector = (value: string): string => value.replace(/([^a-zA-Z0-9_-])/g, '\\$1')

const resolveColorValue = (colors: TailwindColors, key: string): string | undefined => {
  if (key.startsWith('[') && key.endsWith(']')) {
    return key.slice(1, -1)
  }

  const path = key.split('-')
  let current: TailwindScalar | TailwindColors | undefined = colors

  for (const segment of path) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return undefined
    }
    current = current[segment]
  }

  if (typeof current === 'string' || typeof current === 'number') {
    return `${current}`
  }

  return undefined
}

const resolveSpacingValue = (spacing: Record<string, string>, key: string): string | undefined => {
  if (key === 'auto') {
    return 'auto'
  }

  if (key === 'px') {
    return '1px'
  }

  if (key.startsWith('[') && key.endsWith(']')) {
    return key.slice(1, -1)
  }

  return spacing[key]
}

const resolveRadiusValue = (key: string): string | undefined => {
  if (key === '') {
    return '4px'
  }

  if (key === 'none') {
    return '0px'
  }

  if (key === 'sm') {
    return '2px'
  }

  if (key === 'md') {
    return '6px'
  }

  if (key === 'lg') {
    return '8px'
  }

  if (key === 'xl') {
    return '12px'
  }

  if (key === 'full') {
    return '9999px'
  }

  if (key.startsWith('[') && key.endsWith(']')) {
    return key.slice(1, -1)
  }

  return undefined
}

const resolveLineHeightValue = (spacing: Record<string, string>, key: string): string | undefined => {
  if (key.startsWith('[') && key.endsWith(']')) {
    return key.slice(1, -1)
  }

  return spacing[key]
}

const resolveTrackingValue = (key: string): string | undefined => {
  const trackingValues: Record<string, string> = {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  }

  if (key.startsWith('[') && key.endsWith(']')) {
    return key.slice(1, -1)
  }

  return trackingValues[key]
}

const resolveBorderWidthValue = (key: string): string | undefined => {
  if (key === '') {
    return '1px'
  }

  if (key === '0') {
    return '0px'
  }

  if (key === '2') {
    return '2px'
  }

  if (key === '4') {
    return '4px'
  }

  if (key === '8') {
    return '8px'
  }

  if (key.startsWith('[') && key.endsWith(']')) {
    return key.slice(1, -1)
  }

  return undefined
}

const resolveSizeValue = (
  tokenValue: string,
  spacing: Record<string, string>,
  specialValues: Record<string, string> = {}
): string | undefined => {
  if (tokenValue in specialValues) {
    return specialValues[tokenValue]
  }

  if (tokenValue.startsWith('[') && tokenValue.endsWith(']')) {
    return tokenValue.slice(1, -1)
  }

  return spacing[tokenValue]
}

const resolveUtilityClass = (token: string, theme: ResolvedTheme): Record<string, string> | undefined => {
  if (token === 'font-normal') {
    return { 'font-weight': '400' }
  }

  if (token === 'font-medium') {
    return { 'font-weight': '500' }
  }

  if (token === 'font-semibold') {
    return { 'font-weight': '600' }
  }

  if (token === 'font-bold') {
    return { 'font-weight': '700' }
  }

  if (token === 'font-sans') {
    return { 'font-family': theme.fontFamily.sans }
  }

  if (token === 'font-serif') {
    return { 'font-family': theme.fontFamily.serif }
  }

  if (token === 'font-mono') {
    return { 'font-family': theme.fontFamily.mono }
  }

  if (token === 'text-left' || token === 'text-center' || token === 'text-right') {
    return { 'text-align': token.replace('text-', '') }
  }

  if (token === 'italic') {
    return { 'font-style': 'italic' }
  }

  if (token === 'not-italic') {
    return { 'font-style': 'normal' }
  }

  if (token === 'underline') {
    return { 'text-decoration': 'underline' }
  }

  if (token === 'no-underline') {
    return { 'text-decoration': 'none' }
  }

  if (token === 'uppercase' || token === 'lowercase' || token === 'capitalize') {
    return { 'text-transform': token }
  }

  if (token === 'block' || token === 'inline-block' || token === 'inline') {
    return { display: token }
  }

  if (token === 'hidden') {
    return { display: 'none' }
  }

  if (token === 'w-full') {
    return { width: '100%' }
  }

  if (token === 'h-full') {
    return { height: '100%' }
  }

  if (token.startsWith('w-')) {
    const value = resolveSizeValue(token.slice(2), theme.spacing, { auto: 'auto', full: '100%' })
    if (value) {
      return { width: value }
    }
  }

  if (token.startsWith('h-')) {
    const value = resolveSizeValue(token.slice(2), theme.spacing, { auto: 'auto', full: '100%' })
    if (value) {
      return { height: value }
    }
  }

  if (token.startsWith('min-w-')) {
    const value = resolveSizeValue(token.slice('min-w-'.length), theme.spacing, { full: '100%' })
    if (value) {
      return { 'min-width': value }
    }
  }

  if (token.startsWith('min-h-')) {
    const value = resolveSizeValue(token.slice('min-h-'.length), theme.spacing, { full: '100%' })
    if (value) {
      return { 'min-height': value }
    }
  }

  if (token.startsWith('max-w-')) {
    const value = resolveSizeValue(token.slice('max-w-'.length), theme.spacing, {
      full: '100%',
      none: 'none',
    })
    if (value) {
      return { 'max-width': value }
    }
  }

  if (token.startsWith('max-h-')) {
    const value = resolveSizeValue(token.slice('max-h-'.length), theme.spacing, {
      full: '100%',
      none: 'none',
    })
    if (value) {
      return { 'max-height': value }
    }
  }

  if (token.startsWith('leading-')) {
    const value = resolveLineHeightValue(theme.spacing, token.slice('leading-'.length))
    if (value) {
      return { 'line-height': value }
    }
  }

  if (token.startsWith('tracking-')) {
    const value = resolveTrackingValue(token.slice('tracking-'.length))
    if (value) {
      return { 'letter-spacing': value }
    }
  }

  if (token === 'rounded') {
    return { 'border-radius': '4px' }
  }

  if (token.startsWith('rounded-')) {
    const value = resolveRadiusValue(token.slice('rounded-'.length))
    if (value) {
      return { 'border-radius': value }
    }
  }

  if (token.startsWith('text-')) {
    const size = theme.fontSize[token.slice('text-'.length)]
    if (size) {
      return {
        'font-size': size.fontSize,
        ...(size.lineHeight ? { 'line-height': size.lineHeight } : {}),
      }
    }

    const value = resolveColorValue(theme.colors, token.slice('text-'.length))
    if (value) {
      return { color: value }
    }
  }

  if (token.startsWith('bg-')) {
    const value = resolveColorValue(theme.colors, token.slice('bg-'.length))
    if (value) {
      return { 'background-color': value }
    }
  }

  if (token === 'bg-transparent') {
    return { 'background-color': 'transparent' }
  }

  if (token === 'border') {
    return {
      'border-style': 'solid',
      'border-width': '1px',
    }
  }

  if (token === 'border-solid' || token === 'border-dashed' || token === 'border-dotted') {
    return { 'border-style': token.slice('border-'.length) }
  }

  const borderSideMatch = token.match(/^border-([trbl])(?:-(.+))?$/)
  if (borderSideMatch) {
    const [, side, rawValue = ''] = borderSideMatch
    const value = resolveBorderWidthValue(rawValue)
    if (value) {
      const property = {
        t: 'border-top-width',
        r: 'border-right-width',
        b: 'border-bottom-width',
        l: 'border-left-width',
      }[side]

      if (property) {
        return {
          'border-style': 'solid',
          [property]: value,
        }
      }
    }
  }

  if (token.startsWith('border-')) {
    const suffix = token.slice('border-'.length)
    const width = resolveBorderWidthValue(suffix)
    if (width) {
      return {
        'border-style': 'solid',
        'border-width': width,
      }
    }

    const color = resolveColorValue(theme.colors, suffix)
    if (color) {
      return { 'border-color': color }
    }
  }

  const spaceMatch = token.match(/^(p|m)([trblxy]?)-(.+)$/)
  if (spaceMatch) {
    const [, kind, axis, rawValue] = spaceMatch
    const value = resolveSpacingValue(theme.spacing, rawValue)
    if (!value) {
      return undefined
    }

    const prefix = kind === 'p' ? 'padding' : 'margin'
    if (axis === '') {
      return { [prefix]: value }
    }

    if (axis === 'x') {
      return {
        [`${prefix}-left`]: value,
        [`${prefix}-right`]: value,
      }
    }

    if (axis === 'y') {
      return {
        [`${prefix}-top`]: value,
        [`${prefix}-bottom`]: value,
      }
    }

    const propertyByAxis = {
      t: `${prefix}-top`,
      r: `${prefix}-right`,
      b: `${prefix}-bottom`,
      l: `${prefix}-left`,
    } as const

    return { [propertyByAxis[axis as keyof typeof propertyByAxis]]: value }
  }

  return undefined
}

const buildResponsiveCss = (
  fullToken: string,
  variant: string,
  baseToken: string,
  theme: ResolvedTheme
): string | undefined => {
  const screen = theme.screens[variant]
  const declarations = resolveUtilityClass(baseToken, theme)
  if (!screen || !declarations) {
    return undefined
  }

  const cssBody = Object.entries(declarations)
    .map(([property, value]) => `${property}:${value} !important`)
    .join(';')

  return `@media (min-width:${screen}){.${escapeSelector(fullToken)}{${cssBody}}}`
}

export const transformTailwindHtml = (html: string, config?: TailwindConfig): TailwindRenderResult => {
  const theme = resolveTheme(config)
  const document = parse(html)
  const responsiveCss = new Set<string>()

  for (const element of document.querySelectorAll('*')) {
    const classAttribute = element.getAttribute('class')
    if (!classAttribute) {
      continue
    }

    const mergedInlineStyle: Record<string, string> = {}
    const tokens = classAttribute.split(/\s+/).filter(Boolean)

    for (const token of tokens) {
      const separatorIndex = token.indexOf(':')
      if (separatorIndex !== -1) {
        const variant = token.slice(0, separatorIndex)
        const baseToken = token.slice(separatorIndex + 1)
        const responsiveRule = buildResponsiveCss(token, variant, baseToken, theme)
        if (responsiveRule) {
          responsiveCss.add(responsiveRule)
        }
        continue
      }

      Object.assign(mergedInlineStyle, resolveUtilityClass(token, theme))
    }

    if (Object.keys(mergedInlineStyle).length > 0) {
      element.setAttribute('style', mergeStyleAttributes(element.getAttribute('style'), mergedInlineStyle))
    }
  }

  return {
    html: document.toString(),
    headCss: Array.from(responsiveCss).join(''),
  }
}

export const wrapGeneratedHeadCss = (css: string): string =>
  css === ''
    ? ''
    : `<style data-hono-email-head="true">${css}</style>`

export const serializeInlineStyle = (style: Record<string, string>): string => serializeStyleAttribute(style)
