import type { Child } from 'hono/jsx'

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
 *   address: { type: 'string', multiline: true, default: 'Line 1\nLine 2' },
 *   tags: { type: 'array', default: ['Item A', 'Item B'] },
 *   items: {
 *     type: 'array',
 *     item: { name: { type: 'string' }, qty: { type: 'number' } },
 *     default: [{ name: 'Widget', qty: 1 }],
 *   },
 * } satisfies PreviewPropsConfig
 * ```
 *
 * - `multiline: true` renders a string prop as a textarea.
 * - `item` describes each element of an object array so the form can edit
 *   fields per item (add/remove). Arrays without `item` edit as a list of
 *   string values.
 */
export type PreviewPropSpec = {
  type?: 'string' | 'number' | 'boolean' | 'select' | 'array'
  default?: unknown
  required?: boolean
  options?: string[]
  /** Render a string prop as a multi-line textarea. */
  multiline?: boolean
  /** Field schema for each element of an object array. */
  item?: PreviewPropsConfig
}

/**
 * Schema that template authors export as `previewProps` alongside
 * their default-exported email component.
 */
export type PreviewPropsConfig = Record<string, PreviewPropSpec>

export type PropsFieldSchema = {
  type: 'string' | 'number' | 'boolean' | 'select' | 'array'
  required: boolean
  defaultValue?: unknown
  options?: string[]
  multiline?: boolean
  item?: PropsSchema
}

export type PropsSchema = {
  [key: string]: PropsFieldSchema
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const VALID_TYPES = new Set(['string', 'number', 'boolean', 'select', 'array'])

function isValidType(type: unknown): type is 'string' | 'number' | 'boolean' | 'select' | 'array' {
  return typeof type === 'string' && VALID_TYPES.has(type)
}

function inferType(value: unknown): 'string' | 'number' | 'boolean' | 'array' {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (Array.isArray(value)) return 'array'
  return 'string'
}

function normalizeSpec(spec: Record<string, unknown>): PropsFieldSchema {
  const explicitType = isValidType(spec.type) ? spec.type : undefined
  const type = explicitType ?? inferType(spec.default) ?? 'string'

  return {
    type,
    required: spec.required === true,
    ...(spec.default !== undefined ? { defaultValue: spec.default } : {}),
    ...(Array.isArray(spec.options) ? { options: spec.options.map(String) } : {}),
    ...(type === 'string' && spec.multiline === true ? { multiline: true } : {}),
    ...(type === 'array' && isObject(spec.item) ? { item: normalizeSchema(spec.item) } : {}),
  }
}

function normalizeSchema(raw: Record<string, unknown>): PropsSchema {
  const schema: PropsSchema = {}
  for (const [key, spec] of Object.entries(raw)) {
    if (!isObject(spec)) {
      continue
    }
    schema[key] = normalizeSpec(spec)
  }
  return schema
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

  return normalizeSchema(raw)
}

/**
 * Resolve the email component from a template module.
 *
 * Checks `default` first, then falls back to the first exported function
 * (skipping `previewProps` and non-function exports).
 */
type EmailComponent = (props: Record<string, unknown>) => Child

function isEmailComponent(v: unknown, isDefault = false): v is EmailComponent {
  return typeof v === 'function' && (isDefault || 'previewProps' in v)
}

export function resolveComponent(mod: Record<string, unknown>): EmailComponent | null {
  if (isEmailComponent(mod.default, true)) {
    return mod.default
  }

  for (const [key, value] of Object.entries(mod)) {
    if (key === 'previewProps') continue
    if (isEmailComponent(value)) {
      return value
    }
  }

  return null
}

export class MissingRequiredPropsError extends Error {
  constructor(public missingProps: string[]) {
    super(`Missing required props: ${missingProps.join(', ')}`)
    this.name = 'MissingRequiredPropsError'
  }
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

  const missing = Object.entries(schema)
    .filter(([, spec]) => spec.required)
    .map(([key]) => key)
    .filter((key) => !(key in merged))
  if (missing.length > 0) {
    throw new MissingRequiredPropsError(missing)
  }

  return merged
}
