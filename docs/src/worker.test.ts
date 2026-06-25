import { describe, expect, mock, test } from 'bun:test'

const handle = mock(() => new Response('astro-response'))

void mock.module('@astrojs/cloudflare/handler', () => ({ handle }))

const { default: app } = await import('./worker')

function createEnv(assetsResponse = 'markdown-from-assets') {
  return {
    ASSETS: { fetch: mock(() => new Response(assetsResponse)) },
  } as unknown as Env
}

function createExecCtx() {
  return {
    waitUntil: () => {},
    passThroughOnException: () => {},
    props: {},
  }
}

describe('worker routing', () => {
  test('routes .md pathname to ASSETS.fetch', async () => {
    const env = createEnv()
    const req = new Request('https://example.com/docs/page.md')

    const res = await app.fetch(req, env)

    // eslint-disable-next-line typescript-eslint/unbound-method
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(req)
    expect(await res.text()).toBe('markdown-from-assets')
  })

  test('routes /llms-full.txt to ASSETS.fetch', async () => {
    const env = createEnv()
    const req = new Request('https://example.com/llms-full.txt')

    const res = await app.fetch(req, env)

    // eslint-disable-next-line typescript-eslint/unbound-method
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(req)
    expect(await res.text()).toBe('markdown-from-assets')
  })

  test('routes Accept: text/markdown to ASSETS.fetch', async () => {
    const env = createEnv()
    const req = new Request('https://example.com/docs/page', {
      headers: { Accept: 'text/markdown' },
    })

    const res = await app.fetch(req, env)

    // eslint-disable-next-line typescript-eslint/unbound-method
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(req)
    expect(await res.text()).toBe('markdown-from-assets')
  })

  test('routes Accept: text/markdown with complex accept header', async () => {
    const env = createEnv()
    const req = new Request('https://example.com/docs/page', {
      headers: { Accept: 'text/html, text/markdown;q=0.9' },
    })

    const res = await app.fetch(req, env)

    // eslint-disable-next-line typescript-eslint/unbound-method
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(req)
    expect(await res.text()).toBe('markdown-from-assets')
  })

  test('routes normal requests to Astro handler', async () => {
    handle.mockClear()
    const env = createEnv()
    const ctx = createExecCtx()
    const req = new Request('https://example.com/docs/page')

    const res = await app.fetch(req, env, ctx)

    expect(handle).toHaveBeenCalled()
    expect(await res.text()).toBe('astro-response')
  })

  test('does not route Accept: text/html to ASSETS.fetch', async () => {
    handle.mockClear()
    const env = createEnv()
    const ctx = createExecCtx()
    const req = new Request('https://example.com/docs/page', {
      headers: { Accept: 'text/html' },
    })

    const res = await app.fetch(req, env, ctx)

    expect(handle).toHaveBeenCalled()
    expect(await res.text()).toBe('astro-response')
  })
})
