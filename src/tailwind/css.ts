const REM_TO_PX_FACTOR = 16
const MAX_VARIABLE_RESOLUTION_DEPTH = 8

const REM_PATTERN = /(-?\d+(?:\.\d+)?)rem\b/g
const RGB_PATTERN = /^rgb\(\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*\)$/i
const RGB_ALPHA_ONE_PATTERN =
  /^rgb\(\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*\/\s*(1(?:\.0+)?|100%)\s*\)$/i
const OKLCH_PATTERN =
  /^oklch\(\s*(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)(?:\s*\/\s*([^)]+))?\s*\)$/i
const VAR_FUNCTION_PATTERN = /var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,\s*([^)]+))?\)/g

const LOGICAL_PROPERTY_EXPANSIONS: Record<string, string[]> = {
  'border-block': ['border-top', 'border-bottom'],
  'border-block-end': ['border-bottom'],
  'border-block-start': ['border-top'],
  'border-inline': ['border-left', 'border-right'],
  'border-inline-end': ['border-right'],
  'border-inline-start': ['border-left'],
  'margin-block': ['margin-top', 'margin-bottom'],
  'margin-block-end': ['margin-bottom'],
  'margin-block-start': ['margin-top'],
  'margin-inline': ['margin-left', 'margin-right'],
  'margin-inline-end': ['margin-right'],
  'margin-inline-start': ['margin-left'],
  'padding-block': ['padding-top', 'padding-bottom'],
  'padding-block-end': ['padding-bottom'],
  'padding-block-start': ['padding-top'],
  'padding-inline': ['padding-left', 'padding-right'],
  'padding-inline-end': ['padding-right'],
  'padding-inline-start': ['padding-left'],
}

const PROPERTY_ALIASES: Record<string, string[]> = {
  'text-decoration-line': ['text-decoration'],
}

const COLOR_PROPERTIES = new Set([
  'background-color',
  'border-color',
  'color',
  'outline-color',
  'text-decoration-color',
])

const numberToPx = (value: number): string => {
  const rounded = Number(value.toFixed(4))
  return `${rounded}px`
}

const isUnitless = (unit: string): boolean => unit.trim() === ''

const evaluateSimpleCalcExpression = (value: string): string => {
  const calcMatch = value.match(
    /^calc\(\s*(-?\d+(?:\.\d+)?)([a-z%]*)\s*([*/])\s*(-?\d+(?:\.\d+)?)([a-z%]*)\s*\)$/i,
  )
  if (!calcMatch) {
    return value
  }

  const [, leftRaw, leftUnitRaw, operator, rightRaw, rightUnitRaw] = calcMatch
  const left = Number(leftRaw)
  const right = Number(rightRaw)
  const leftUnit = (leftUnitRaw ?? '').toLowerCase()
  const rightUnit = (rightUnitRaw ?? '').toLowerCase()

  if (Number.isNaN(left) || Number.isNaN(right)) {
    return value
  }

  if (operator === '*') {
    if (!isUnitless(leftUnit) && !isUnitless(rightUnit)) {
      return value
    }

    if (!isUnitless(leftUnit)) {
      return `${left * right}${leftUnit}`
    }

    if (!isUnitless(rightUnit)) {
      return `${left * right}${rightUnit}`
    }

    return `${left * right}`
  }

  if (!isUnitless(rightUnit) || right === 0) {
    return value
  }

  if (!isUnitless(leftUnit)) {
    return `${left / right}${leftUnit}`
  }

  return `${left / right}`
}

export const normalizeCssValue = (value: string): string =>
  evaluateSimpleCalcExpression(value)
    .replace(REM_PATTERN, (_, remValue: string) => numberToPx(Number(remValue) * REM_TO_PX_FACTOR))
    .replace(/\s+/g, ' ')
    .trim()

const toHex = (component: number): string => component.toString(16).padStart(2, '0')

const rgbToHex = (red: string, green: string, blue: string): string => {
  const normalize = (component: string): number => {
    const parsed = Number(component)
    if (Number.isNaN(parsed)) {
      return 0
    }

    return Math.min(255, Math.max(0, parsed))
  }

  return `#${toHex(normalize(red))}${toHex(normalize(green))}${toHex(normalize(blue))}`
}

const linearSrgbToSrgb = (value: number): number =>
  value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

const oklchToHex = (lightnessPercent: string, chromaRaw: string, hueRaw: string): string => {
  const lightness = Number(lightnessPercent) / 100
  const chroma = Number(chromaRaw)
  const hue = (Number(hueRaw) * Math.PI) / 180

  if ([lightness, chroma, hue].some((value) => Number.isNaN(value))) {
    return `oklch(${lightnessPercent}% ${chromaRaw} ${hueRaw})`
  }

  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b

  const l = lPrime ** 3
  const m = mPrime ** 3
  const s = sPrime ** 3

  const linearRed = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const linearGreen = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const linearBlue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  const red = Math.round(clamp01(linearSrgbToSrgb(linearRed)) * 255)
  const green = Math.round(clamp01(linearSrgbToSrgb(linearGreen)) * 255)
  const blue = Math.round(clamp01(linearSrgbToSrgb(linearBlue)) * 255)

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

const normalizeColorValue = (value: string): string => {
  const rgbWithAlphaOneMatch = value.match(RGB_ALPHA_ONE_PATTERN)
  if (rgbWithAlphaOneMatch) {
    const [, red, green, blue] = rgbWithAlphaOneMatch
    return rgbToHex(red ?? '', green ?? '', blue ?? '')
  }

  const rgbMatch = value.match(RGB_PATTERN)
  if (rgbMatch) {
    const [, red, green, blue] = rgbMatch
    return rgbToHex(red ?? '', green ?? '', blue ?? '')
  }

  const oklchMatch = value.match(OKLCH_PATTERN)
  if (oklchMatch) {
    const [, lightness, chroma, hue, alpha] = oklchMatch
    if (!alpha || alpha.trim() === '1' || alpha.trim() === '100%') {
      return oklchToHex(lightness ?? '', chroma ?? '', hue ?? '')
    }
  }

  return value
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const resolveCssVariables = (
  value: string,
  themeVariables: Record<string, string>,
): string => {
  let resolved = value

  for (let depth = 0; depth < MAX_VARIABLE_RESOLUTION_DEPTH; depth += 1) {
    let changed = false
    resolved = resolved.replace(
      VAR_FUNCTION_PATTERN,
      (match, variableName: string, fallback: string | undefined) => {
        const mappedValue = themeVariables[variableName]
        if (mappedValue !== undefined) {
          changed = true
          return mappedValue
        }

        if (fallback !== undefined) {
          changed = true
          return fallback.trim()
        }

        return match
      },
    )

    if (!changed) {
      break
    }
  }

  return resolved
}

export const normalizeMediaQuery = (query: string): string => {
  const normalized = normalizeCssValue(query)
  const minWidthMatch = normalized.match(/^\(\s*width\s*>=\s*([^)]+)\)$/i)
  if (minWidthMatch) {
    return `(min-width:${(minWidthMatch[1] ?? '').trim()})`
  }

  const maxWidthMatch = normalized.match(/^\(\s*width\s*<=\s*([^)]+)\)$/i)
  if (maxWidthMatch) {
    return `(max-width:${(maxWidthMatch[1] ?? '').trim()})`
  }

  return normalized
}

export const normalizeDeclarations = (
  declarations: Record<string, string>,
  themeVariables: Record<string, string>,
): Record<string, string> => {
  const normalized: Record<string, string> = {}

  for (const [property, rawValue] of Object.entries(declarations)) {
    const normalizedProperty = property.trim().toLowerCase()
    const normalizedValue = normalizeCssValue(resolveCssVariables(rawValue, themeVariables))

    if (normalizedProperty === '' || normalizedValue === '') {
      continue
    }

    const expandedProperties = LOGICAL_PROPERTY_EXPANSIONS[normalizedProperty]
    if (expandedProperties) {
      for (const expandedProperty of expandedProperties) {
        normalized[expandedProperty] = normalizedValue
      }
      continue
    }

    const aliasedProperties = PROPERTY_ALIASES[normalizedProperty]
    if (aliasedProperties) {
      for (const aliasedProperty of aliasedProperties) {
        normalized[aliasedProperty] = normalizedValue
      }
      continue
    }

    normalized[normalizedProperty] = normalizedValue
  }

  const localTwVariables = Object.entries(normalized).filter(([property]) =>
    property.startsWith('--tw-'),
  )

  for (const [property, currentValue] of Object.entries(normalized)) {
    if (property.startsWith('--tw-')) {
      continue
    }

    let resolvedValue = currentValue
    for (const [variableName, variableValue] of localTwVariables) {
      const variablePattern = new RegExp(
        `var\\(${escapeRegExp(variableName)}(?:\\s*,\\s*[^)]+)?\\)`,
        'g',
      )
      resolvedValue = resolvedValue.replace(variablePattern, variableValue)
    }

    normalized[property] = normalizeCssValue(resolvedValue)
  }

  for (const property of COLOR_PROPERTIES) {
    const currentValue = normalized[property]
    if (!currentValue) {
      continue
    }

    normalized[property] = normalizeColorValue(currentValue)
  }

  for (const [variableName] of localTwVariables) {
    delete normalized[variableName]
  }

  const hasBorderWidth =
    normalized['border-width'] !== undefined ||
    normalized['border-top-width'] !== undefined ||
    normalized['border-right-width'] !== undefined ||
    normalized['border-bottom-width'] !== undefined ||
    normalized['border-left-width'] !== undefined

  if (hasBorderWidth && normalized['border-style'] === undefined) {
    normalized['border-style'] = 'solid'
  }

  return normalized
}

export const escapeSelector = (value: string): string => value.replace(/([^a-zA-Z0-9_-])/g, '\\$1')
