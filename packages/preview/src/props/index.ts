/**
 * User-facing prop spec for a single prop in the `previewProps` export.
 *
 * @example
 * ```tsx
 * import type { PreviewPropsConfig } from '@hono-email/preview'
 *
 * export const previewProps = {
 *   name: { type: 'string', default: 'Guest' },
 *   showButton: { type: 'boolean', default: true },
 *   items: { type: 'array', default: ['Item A', 'Item B'] },
 * } satisfies PreviewPropsConfig
 * ```
 */
export type PreviewPropSpec = {
  type?: 'string' | 'number' | 'boolean' | 'select' | 'array'
  default?: unknown
  required?: boolean
  options?: string[]
}

/**
 * Schema that template authors export as `previewProps` alongside
 * their default-exported email component.
 */
export type PreviewPropsConfig = Record<string, PreviewPropSpec>

export type PropsSchema = {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'array'
    required: boolean
    defaultValue?: unknown
    options?: string[]
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const VALID_TYPES = new Set(['string', 'number', 'boolean', 'select', 'array'])

function inferType(value: unknown): PreviewPropSpec['type'] {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (Array.isArray(value)) return 'array'
  return 'string'
}

/**
 * Extract a props schema from a template module's `previewProps` export.
 *
 * If the module does not export `previewProps`, returns an empty schema
 * so the preview UI can fall back to JSON mode.
 */
export function extractPropsSchema(mod: Record<string, unknown>): PropsSchema {
  const raw = mod.previewProps
  if (!isObject(raw)) {
    return {}
  }

  const schema: PropsSchema = {}
  for (const [key, spec] of Object.entries(raw)) {
    if (!isObject(spec)) {
      continue
    }

    const explicitType =
      typeof spec.type === 'string' && VALID_TYPES.has(spec.type)
        ? (spec.type as PreviewPropSpec['type'])
        : undefined
    const type = explicitType ?? inferType(spec.default) ?? 'string'

    schema[key] = {
      type,
      required: spec.required === true,
      ...(spec.default !== undefined ? { defaultValue: spec.default } : {}),
      ...(Array.isArray(spec.options) ? { options: spec.options.map(String) } : {}),
    }
  }

  return schema
}

/**
 * Resolve the email component from a template module.
 *
 * Checks `default` first, then falls back to the first exported function
 * (skipping `previewProps` and non-function exports).
 */
export function resolveComponent(mod: Record<string, unknown>): Function | null {
  if (typeof mod.default === 'function') {
    return mod.default as Function
  }

  for (const [key, value] of Object.entries(mod)) {
    if (key === 'previewProps') continue
    if (typeof value === 'function') {
      return value as Function
    }
  }

  return null
}

export function mergePropsWithDefaults(
  schema: PropsSchema,
  userProps: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(schema)) {
    if (key in userProps) {
      merged[key] = userProps[key]
    } else if (spec.defaultValue !== undefined) {
      merged[key] = spec.defaultValue
    }
  }
  for (const [key, value] of Object.entries(userProps)) {
    if (!(key in merged)) {
      merged[key] = value
    }
  }
  return merged
}
