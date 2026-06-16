import { describe, expect, test } from 'bun:test'

import { extractPropsSchema, mergePropsWithDefaults } from './index'

describe('mergePropsWithDefaults', () => {
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
})

describe('extractPropsSchema', () => {
  test('returns empty schema for any component', () => {
    const component = () => {}
    expect(extractPropsSchema(component)).toEqual({})
  })
})
