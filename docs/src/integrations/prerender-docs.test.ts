import { describe, expect, test } from 'bun:test'

import { prerenderDocs } from './prerender-docs'

describe('prerenderDocs', () => {
  test('returns integration named prerender-docs', () => {
    expect(prerenderDocs().name).toBe('prerender-docs')
  })

  test('registers astro:route:setup hook', () => {
    const integration = prerenderDocs()
    expect(integration.hooks['astro:route:setup']).toBeFunction()
  })

  test('hook sets route.prerender to true', async () => {
    const hook = prerenderDocs().hooks['astro:route:setup']
    if (!hook) return
    const route = { prerender: false as boolean }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    await hook({ route } as Parameters<typeof hook>[0])
    expect(route.prerender).toBe(true)
  })
})
