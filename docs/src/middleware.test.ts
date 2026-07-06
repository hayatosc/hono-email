import { describe, expect, test } from 'bun:test'

import { patchComponentUrls } from './component-url-patch'

describe('patchComponentUrls', () => {
  test('adds /@fs prefix to Unix absolute file-system paths', () => {
    const html = '<div component-url="/absolute/path/to/file.svelte"></div>'
    expect(patchComponentUrls(html)).toBe(
      '<div component-url="/@fs/absolute/path/to/file.svelte"></div>',
    )
  })

  test('adds /@fs prefix to Windows absolute file-system paths', () => {
    const html = '<div component-url="C:/Users/foo/file.svelte"></div>'
    expect(patchComponentUrls(html)).toBe(
      '<div component-url="/@fsC:/Users/foo/file.svelte"></div>',
    )
  })

  test('leaves /src/-prefixed URLs unchanged', () => {
    const html = '<div component-url="/src/App.svelte"></div>'
    expect(patchComponentUrls(html)).toBe(html)
  })

  test('leaves /@-prefixed URLs unchanged', () => {
    const html = '<div component-url="/@id/foo.js"></div>'
    expect(patchComponentUrls(html)).toBe(html)
  })

  test('leaves /_-prefixed URLs unchanged', () => {
    const html = '<div component-url="/_astro/foo.js"></div>'
    expect(patchComponentUrls(html)).toBe(html)
  })

  test('leaves relative URLs unchanged', () => {
    const html = '<div component-url="./relative/path.js"></div>'
    expect(patchComponentUrls(html)).toBe(html)
  })

  test('handles multiple component-url attributes', () => {
    const html =
      '<div component-url="/absolute/a.js"></div><span component-url="/src/b.js"></span><div component-url="D:/x/c.js"></div>'
    expect(patchComponentUrls(html)).toBe(
      '<div component-url="/@fs/absolute/a.js"></div><span component-url="/src/b.js"></span><div component-url="/@fsD:/x/c.js"></div>',
    )
  })

  test('does not touch text without component-url attributes', () => {
    const html = '<div data-url="/absolute/path"></div>'
    expect(patchComponentUrls(html)).toBe(html)
  })
})
