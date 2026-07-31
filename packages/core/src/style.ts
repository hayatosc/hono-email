import type { JSX } from 'hono/jsx'

export type StyleValue = string | number
export type StyleRecord = Record<string, StyleValue>

const kebabCasePattern = /[A-Z]/g

const toKebabCase = (value: string): string =>
  value.replace(kebabCasePattern, (match) => `-${match.toLowerCase()}`)

export const styleObjectFromUnknown = (style: unknown): StyleRecord | undefined => {
  if (typeof style === 'object' && style !== null && !Array.isArray(style)) {
    const normalized: StyleRecord = {}

    for (const [key, value] of Object.entries(style)) {
      if (value === undefined || value === null) {
        continue
      }

      if (typeof value !== 'string' && typeof value !== 'number') {
        return undefined
      }

      normalized[key] = value
    }

    return normalized
  }

  return undefined
}

export const normalizeStyleObject = (
  style?: JSX.CSSProperties | StyleRecord,
): Record<string, string> => {
  if (!style) {
    return {}
  }

  const normalized: Record<string, string> = {}

  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) {
      continue
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      continue
    }

    normalized[toKebabCase(key)] = `${value}`
  }

  return normalized
}

export const parseStyleAttribute = (style?: string): Record<string, string> => {
  if (!style) {
    return {}
  }

  return style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, declaration) => {
      const separatorIndex = declaration.indexOf(':')
      if (separatorIndex === -1) {
        return accumulator
      }

      const property = declaration.slice(0, separatorIndex).trim()
      const value = declaration.slice(separatorIndex + 1).trim()
      if (property !== '' && value !== '') {
        accumulator[property] = value
      }
      return accumulator
    }, {})
}

export const serializeStyleAttribute = (style: Record<string, string>): string =>
  Object.entries(style)
    .map(([property, value]) => `${property}:${value}`)
    .join(';')

/**
 * Merges style declarations, giving precedence to the first argument.
 *
 * Declarations in `highPrecedenceStyle` override matching properties in
 * `lowPrecedenceStyle` and are serialized last, so they win in the resulting
 * `style` attribute.
 *
 * @param highPrecedenceStyle - Declarations that win over `lowPrecedenceStyle`.
 * @param lowPrecedenceStyle - Declarations used only for properties that
 * `highPrecedenceStyle` does not set.
 * @returns The merged `style` attribute value.
 */
export const mergeStyleAttributes = (
  highPrecedenceStyle: string | undefined,
  lowPrecedenceStyle: Record<string, string>,
): string => {
  const merged = { ...lowPrecedenceStyle }
  for (const [property, value] of Object.entries(parseStyleAttribute(highPrecedenceStyle))) {
    delete merged[property]
    merged[property] = value
  }

  return serializeStyleAttribute(merged)
}
