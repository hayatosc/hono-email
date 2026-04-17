import { describe, expect, test } from 'bun:test'

import { render } from '../../src'

describe('render strict mode', () => {
  test('rejects unsupported interactive tags by default', async () => {
    await expect(
      render(
        <html>
          <body>
            <form action='https://example.com'>
              <input name='email' />
            </form>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The <form> tag isn't supported in HTML email strict mode. Use <Button href=\"...\"> or <Link href=\"...\"> for clickable actions instead."
    )
  })

  test('allows unsupported tags when strict mode is disabled', async () => {
    const html = await render(
      <html>
        <body>
          <form action='https://example.com'>
            <input name='email' />
          </form>
        </body>
      </html>,
      { strict: false }
    )

    expect(html).toContain('<form')
    expect(html).toContain('<input')
  })

  test('normalizes semantic tags to divs', async () => {
    const html = await render(
      <html>
        <body>
          <section data-role='hero'>
            <article>News</article>
          </section>
        </body>
      </html>
    )

    expect(html).toContain('<div data-role="hero"><div>News</div></div>')
    expect(html).not.toContain('<section')
    expect(html).not.toContain('<article')
  })

  test('rejects grid layout in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ display: 'grid' }}>Hello</div>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The CSS property 'display:grid' isn't supported in HTML email strict mode. Use <Section>, <Row>, <Column>, or table-based layout instead."
    )
  })

  test('rejects logical CSS properties in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ paddingInline: '12px' }}>Hello</div>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The CSS property 'padding-inline' isn't supported in HTML email strict mode. Use physical properties such as padding-left and padding-right instead."
    )
  })

  test('rejects anchor tags without href in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <a>Open</a>
          </body>
        </html>
      )
    ).rejects.toThrow(
      'The <a> tag is missing an href attribute. Use <Link href="..."> or <Button href="..."> with a real destination URL.'
    )
  })
})
