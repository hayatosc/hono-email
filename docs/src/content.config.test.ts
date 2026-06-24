import { describe, expect, mock, test } from 'bun:test'

const mockLoader = { _id: 'docs-loader' }
const mockSchema = { _id: 'docs-schema' }

mock.module('astro:content', () => ({
  defineCollection: (config: Record<string, unknown>) => config,
}))

mock.module('@astrojs/starlight/loaders', () => ({
  docsLoader: () => mockLoader,
}))

mock.module('@astrojs/starlight/schema', () => ({
  docsSchema: () => mockSchema,
}))

const { collections } = await import('./content.config')

describe('content.config collections', () => {
  test('exports a docs collection', () => {
    expect(collections).toHaveProperty('docs')
  })

  test('docs collection is wired to docsLoader', () => {
    expect((collections.docs as { loader: unknown }).loader).toBe(mockLoader)
  })

  test('docs collection is wired to docsSchema', () => {
    expect((collections.docs as { schema: unknown }).schema).toBe(mockSchema)
  })
})
