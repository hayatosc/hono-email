export type PropsSchema = {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select'
    required: boolean
    defaultValue?: unknown
    options?: string[]
  }
}

export function extractPropsSchema(_component: Function): PropsSchema {
  // TODO: Use TypeScript compiler API for proper prop type extraction
  return {}
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
