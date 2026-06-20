import { describe, expect, test } from 'bun:test'

import { render } from '../index'
import { relocateHeadStyles } from './head-styles'

describe('style placement', () => {
  test('allows style tags inside head', async () => {
    const { html } = await render(
      <html>
        <head>
          <style>{'p { color: red; }'}</style>
        </head>
        <body>
          <p>Hello</p>
        </body>
      </html>,
    )

    expect(html).toContain('<head><style>p { color: red; }</style></head>')
  })

  test('rejects style tags outside head in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <style>{'p { color: red; }'}</style>
            <p>Hello</p>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      'The <style> tag must be placed inside <Head> in HTML email strict mode. Move shared CSS into <Head>, or use inline style props for element-level styling.',
    )
  })
})

describe('relocateHeadStyles fallbacks', () => {
  const styleTag = '<style data-hono-email-head="true">p{color:red}</style>'

  test('inserts after <html> when no <head> exists', () => {
    const result = relocateHeadStyles(`<html>${styleTag}<body>hi</body></html>`)
    expect(result).toBe(`<html><head>${styleTag}</head><body>hi</body></html>`)
  })

  test('inserts before <body> when no <head> or <html>', () => {
    const result = relocateHeadStyles(`${styleTag}<body>hi</body>`)
    expect(result).toBe(`<head>${styleTag}</head><body>hi</body>`)
  })

  test('prepends <head> when no <head>, <html>, or <body>', () => {
    const result = relocateHeadStyles(styleTag)
    expect(result).toBe(`<head>${styleTag}</head>`)
  })

  test('relocates multiple style tags', () => {
    const second = '<style data-hono-email-head="true">h1{font-size:20px}</style>'
    const result = relocateHeadStyles(`<html>${styleTag}${second}<body>hi</body></html>`)
    expect(result).toContain(styleTag)
    expect(result).toContain(second)
    expect(result).toContain('<head>')
  })
})
