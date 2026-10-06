import { describe, expect, test } from 'bun:test'

import {
  definePreviewProps,
  extractPropsSchema,
  mergePropsWithDefaults,
  resolveComponent,
} from './index'

describe('definePreviewProps', () => {
  test('infers non-string fields from non-null defaults', () => {
    const config = definePreviewProps<{
      count: number
      enabled: boolean
      tags: string[]
      items: { quantity: number }[]
    }>()({
      count: { default: 0 },
      enabled: { default: false },
      tags: { default: [] },
      items: { default: [], item: { quantity: { default: 0 } } },
    })

    expect(extractPropsSchema({ previewProps: config })).toEqual({
      count: { type: 'number', required: false, defaultValue: 0 },
      enabled: { type: 'boolean', required: false, defaultValue: false },
      tags: { type: 'array', required: false, defaultValue: [] },
      items: {
        type: 'array',
        required: false,
        defaultValue: [],
        item: { quantity: { type: 'number', required: false, defaultValue: 0 } },
      },
    })
  })

  test('preserves schema inference and supports existing schema extraction', () => {
    type Props = {
      name: string
      theme: 'light' | 'dark'
      items: { quantity: number }[]
      optional?: boolean
    }
    const config = definePreviewProps<Props>()({
      name: { type: 'string', default: 'Guest' },
      theme: { type: 'select', options: ['light', 'dark'], default: 'light' },
      items: { type: 'array', item: { quantity: { type: 'number' } } },
    })

    expect(extractPropsSchema({ previewProps: config })).toEqual({
      name: { type: 'string', required: false, defaultValue: 'Guest' },
      theme: { type: 'select', required: false, options: ['light', 'dark'], defaultValue: 'light' },
      items: {
        type: 'array',
        required: false,
        item: { quantity: { type: 'number', required: false } },
      },
    })
  })
})

describe('extractPropsSchema', () => {
  test('returns empty schema when module has no previewProps', () => {
    const mod = { default: () => {} }
    expect(extractPropsSchema(mod)).toEqual({})
  })

  test('returns empty schema when previewProps is not an object', () => {
    const mod = { default: () => {}, previewProps: 'invalid' }
    expect(extractPropsSchema(mod)).toEqual({})
  })

  test('extracts schema from previewProps export', () => {
    const mod = {
      default: () => {},
      previewProps: {
        name: { type: 'string', default: 'Guest' },
        count: { type: 'number', default: 5 },
        showButton: { type: 'boolean', default: true },
      },
    }

    expect(extractPropsSchema(mod)).toEqual({
      name: { type: 'string', required: false, defaultValue: 'Guest' },
      count: { type: 'number', required: false, defaultValue: 5 },
      showButton: { type: 'boolean', required: false, defaultValue: true },
    })
  })

  test('handles required props without defaults', () => {
    const mod = {
      default: () => {},
      previewProps: {
        email: { type: 'string', required: true },
      },
    }

    expect(extractPropsSchema(mod)).toEqual({
      email: { type: 'string', required: true },
    })
  })

  test('supports select type with options', () => {
    const mod = {
      default: () => {},
      previewProps: {
        theme: { type: 'select', options: ['light', 'dark'], default: 'light' },
      },
    }

    expect(extractPropsSchema(mod)).toEqual({
      theme: {
        type: 'select',
        required: false,
        defaultValue: 'light',
        options: ['light', 'dark'],
      },
    })
  })

  test('supports array type', () => {
    const mod = {
      default: () => {},
      previewProps: {
        items: { type: 'array', default: ['a', 'b'] },
      },
    }

    expect(extractPropsSchema(mod)).toEqual({
      items: { type: 'array', required: false, defaultValue: ['a', 'b'] },
    })
  })

  test('extracts nested item schema for object arrays', () => {
    const mod = {
      default: () => {},
      previewProps: {
        items: {
          type: 'array',
          item: {
            name: { type: 'string' },
            qty: { type: 'number' },
          },
          default: [{ name: 'A', qty: 1 }],
        },
      },
    }

    expect(extractPropsSchema(mod)).toEqual({
      items: {
        type: 'array',
        required: false,
        defaultValue: [{ name: 'A', qty: 1 }],
        item: {
          name: { type: 'string', required: false },
          qty: { type: 'number', required: false },
        },
      },
    })
  })

  test('ignores item schema for non-array types', () => {
    const mod = {
      default: () => {},
      previewProps: {
        name: { type: 'string', item: { foo: { type: 'string' } } },
      },
    }

    expect(extractPropsSchema(mod)).toEqual({
      name: { type: 'string', required: false },
    })
  })

  test('carries multiline flag for string props', () => {
    const mod = {
      default: () => {},
      previewProps: {
        address: { type: 'string', multiline: true, default: 'a\nb' },
        name: { type: 'string', default: 'x' },
        count: { type: 'number', multiline: true },
      },
    }

    const schema = extractPropsSchema(mod)
    expect(schema.address).toEqual({
      type: 'string',
      required: false,
      defaultValue: 'a\nb',
      multiline: true,
    })
    expect(schema.name?.multiline).toBeUndefined()
    expect(schema.count?.multiline).toBeUndefined()
  })

  test('infers type from default value when type is omitted', () => {
    const mod = {
      default: () => {},
      previewProps: {
        name: { default: 'Guest' },
        count: { default: 42 },
        active: { default: false },
        tags: { default: ['a', 'b'] },
      },
    }

    const schema = extractPropsSchema(mod)
    expect(schema.name?.type).toBe('string')
    expect(schema.count?.type).toBe('number')
    expect(schema.active?.type).toBe('boolean')
    expect(schema.tags?.type).toBe('array')
  })

  test('skips non-object entries in previewProps', () => {
    const mod = {
      default: () => {},
      previewProps: {
        valid: { type: 'string', default: 'ok' },
        invalid: 'not an object',
        alsoInvalid: 42,
      },
    }

    const schema = extractPropsSchema(mod)
    expect(Object.keys(schema)).toEqual(['valid'])
  })
})

describe('resolveComponent', () => {
  test('returns default export when it is a function', () => {
    const fn = () => null
    const mod = { default: fn }
    expect(resolveComponent(mod)).toBe(fn)
  })

  test('returns null when default export is not a function', () => {
    const mod = { default: {} }
    expect(resolveComponent(mod)).toBeNull()
  })

  test('falls back to named function export when no default', () => {
    const MyEmail = () => null
    ;(MyEmail as { previewProps?: Record<string, unknown> }).previewProps = {}
    const mod = { MyEmail }
    expect(resolveComponent(mod)).toBe(MyEmail)
  })

  test('falls back to a single named function with sibling previewProps', () => {
    const MyEmail = () => null
    const mod = { MyEmail, previewProps: {} }
    expect(resolveComponent(mod)).toBe(MyEmail)
  })

  test('skips named function exports without previewProps', () => {
    const MyEmail = () => null
    const util = () => null
    const mod = { MyEmail, util, previewProps: {} }
    expect(resolveComponent(mod)).toBeNull()
  })

  test('skips previewProps when looking for named exports', () => {
    const mod = { previewProps: {} }
    expect(resolveComponent(mod)).toBeNull()
  })

  test('returns null for empty module', () => {
    expect(resolveComponent({})).toBeNull()
  })
})

describe('mergePropsWithDefaults', () => {
  test('does not treat inherited properties as supplied props', () => {
    const schema = {
      toString: { type: 'string' as const, required: true },
    }

    expect(() => mergePropsWithDefaults(schema, {})).toThrow('Missing required props: toString')
  })

  test('merges user props with schema default values', () => {
    const schema = {
      customerName: { type: 'string' as const, required: false, defaultValue: 'Guest' },
      orderId: { type: 'string' as const, required: true, defaultValue: '0000' },
      showButton: { type: 'boolean' as const, required: false, defaultValue: true },
    }

    const merged = mergePropsWithDefaults(schema, { customerName: 'Alice' })
    expect(merged).toEqual({
      customerName: 'Alice',
      orderId: '0000',
      showButton: true,
    })
  })

  test('keeps extra user props not present in schema', () => {
    const schema = {
      customerName: { type: 'string' as const, required: false, defaultValue: 'Guest' },
    }

    const merged = mergePropsWithDefaults(schema, { customerName: 'Bob', extraProp: 42 })
    expect(merged).toEqual({
      customerName: 'Bob',
      extraProp: 42,
    })
  })

  test('handles array default values', () => {
    const schema = {
      items: { type: 'array' as const, required: false, defaultValue: ['a', 'b'] },
    }

    const merged = mergePropsWithDefaults(schema, {})
    expect(merged).toEqual({ items: ['a', 'b'] })
  })

  test('throws when required field without default is missing', () => {
    const schema = {
      email: { type: 'string' as const, required: true },
    }

    expect(() => mergePropsWithDefaults(schema, {})).toThrow('Missing required props: email')
  })

  test('throws listing all missing required fields', () => {
    const schema = {
      email: { type: 'string' as const, required: true },
      name: { type: 'string' as const, required: true },
    }

    expect(() => mergePropsWithDefaults(schema, {})).toThrow('Missing required props: email, name')
  })

  test('does not throw when required field with default is omitted', () => {
    const schema = {
      email: { type: 'string' as const, required: true, defaultValue: 'a@b.com' },
    }

    const merged = mergePropsWithDefaults(schema, {})
    expect(merged).toEqual({ email: 'a@b.com' })
  })
})
