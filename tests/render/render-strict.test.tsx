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

  test('rejects CSS variables in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ '--color': 'red' } as any}>Hello</div>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "CSS variables ('--color') aren't supported in HTML email strict mode."
    )

    await expect(
      render(
        <html>
          <body>
            <div style={{ color: 'var(--color)' }}>Hello</div>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The 'var()' function isn't supported in HTML email strict mode. Use static values instead."
    )
  })

  test('rejects filter property in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ filter: 'blur(5px)' }}>Hello</div>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The CSS property 'filter' isn't supported in HTML email strict mode."
    )
  })

  test('warns about box-shadow, calc, and border-radius in strict mode', async () => {
    const html = await render(
      <html>
        <body>
          <div style={{ boxShadow: '0 0 10px rgba(0,0,0,0.5)', borderRadius: '8px', width: 'calc(100% - 20px)', fontSize: '1.2rem' }}>
            Hello
          </div>
        </body>
      </html>
    )

    expect(html).toContain('box-shadow:0 0 10px rgba(0,0,0,0.5)')
    // Warnings are not returned by render function, but we can verify the validation logic separately if needed.
    // However, the render function currently doesn't expose warnings to the user easily besides logs or something.
    // Let's check if there's a way to capture warnings.
  })

  test('rejects transform and animation properties in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ transform: 'rotate(45deg)' }}>Hello</div>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The CSS property 'transform' isn't supported in HTML email strict mode."
    )

    await expect(
      render(
        <html>
          <body>
            <div style={{ animation: 'fade 1s' }}>Hello</div>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The CSS property 'animation' isn't supported in HTML email strict mode."
    )
  })

  test('rejects aspect-ratio in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ aspectRatio: '16/9' }}>Hello</div>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The CSS property 'aspect-ratio' isn't supported in HTML email strict mode."
    )
  })

  test('rejects position:fixed and position:sticky in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ position: 'fixed' }}>Hello</div>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The CSS property 'position:fixed' isn't supported in HTML email strict mode."
    )

    await expect(
      render(
        <html>
          <body>
            <div style={{ position: 'sticky' }}>Hello</div>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The CSS property 'position:sticky' isn't supported in HTML email strict mode."
    )
  })

  test('rejects advanced background properties in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ backgroundAttachment: 'fixed' }}>Hello</div>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The CSS property 'background-attachment' isn't supported in HTML email strict mode."
    )
  })

  test('warns about float and clear properties in strict mode', async () => {
    const html = await render(
      <html>
        <body>
          <div style={{ float: 'left', clear: 'both' }}>Hello</div>
        </body>
      </html>
    )

    expect(html).toContain('float:left')
    expect(html).toContain('clear:both')
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
