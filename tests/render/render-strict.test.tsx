import { describe, expect, spyOn, test } from 'bun:test'

import { render } from '../../src'
import { validateHtml } from '../../src/validate/html'

const withWarnSpy = async (
  run: () => Promise<string>,
): Promise<{ html: string; warnings: string[] }> => {
  const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})

  try {
    const html = await run()
    const warnings = warnSpy.mock.calls.map((call) => String(call[0] ?? ''))
    return { html, warnings }
  } finally {
    warnSpy.mockRestore()
  }
}

describe('render strict mode', () => {
  test('rejects unsupported interactive tags by default', async () => {
    await expect(
      render(
        <html>
          <body>
            <form action="https://example.com">
              <input name="email" />
            </form>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      'The <form> tag isn\'t supported in HTML email strict mode. Use <Button href="..."> or <Link href="..."> for clickable actions instead.',
    )
  })

  test('allows unsupported tags when strict mode is disabled', async () => {
    const html = await render(
      <html>
        <body>
          <form action="https://example.com">
            <input name="email" />
          </form>
        </body>
      </html>,
      { strict: false },
    )

    expect(html).toContain('<form')
    expect(html).toContain('<input')
  })

  test('normalizes semantic tags to divs', async () => {
    const html = await render(
      <html>
        <body>
          <section data-role="hero">
            <article>News</article>
          </section>
        </body>
      </html>,
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
        </html>,
      ),
    ).rejects.toThrow(
      "The CSS property 'display:grid' isn't supported in HTML email strict mode. Use <Section>, <Row>, <Column>, or table-based layout instead.",
    )
  })

  test('normalizes declaration values before strict declaration checks', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={'display: grid !important'}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      "The CSS property 'display:grid' isn't supported in HTML email strict mode. Use <Section>, <Row>, <Column>, or table-based layout instead.",
    )
  })

  test('rejects logical CSS properties in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ paddingInline: '12px' }}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      "The CSS property 'padding-inline' isn't supported in HTML email strict mode. Use physical properties such as padding-left and padding-right instead.",
    )
  })

  test('rejects CSS variables in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={'--color:red'}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow("CSS variables ('--color') aren't supported in HTML email strict mode.")

    await expect(
      render(
        <html>
          <body>
            <div style={{ color: 'var(--color)' }}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      "The 'var()' function isn't supported in HTML email strict mode. Use static values instead.",
    )
  })

  test('rejects filter property in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ filter: 'blur(5px)' }}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow("The CSS property 'filter' isn't supported in HTML email strict mode.")
  })

  test('warns about box-shadow, calc, and border-radius in strict mode', async () => {
    const { html, warnings } = await withWarnSpy(() =>
      render(
        <html>
          <body>
            <div
              style={{
                boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                borderRadius: '8px',
                width: 'calc(100% - 20px)',
                fontSize: '1.2rem',
              }}
            >
              Hello
            </div>
          </body>
        </html>,
      ),
    )

    expect(html).toContain('box-shadow:0 0 10px rgba(0,0,0,0.5)')
    expect(warnings.some((message) => message.includes("The CSS property 'box-shadow'"))).toBe(true)
    expect(warnings.some((message) => message.includes("The CSS function 'calc()'"))).toBe(true)
    expect(warnings.some((message) => message.includes("The CSS property 'border-radius'"))).toBe(
      true,
    )
  })

  test('rejects transform and animation properties in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ transform: 'rotate(45deg)' }}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow("The CSS property 'transform' isn't supported in HTML email strict mode.")

    await expect(
      render(
        <html>
          <body>
            <div style={{ animation: 'fade 1s' }}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow("The CSS property 'animation' isn't supported in HTML email strict mode.")
  })

  test('rejects aspect-ratio in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ aspectRatio: '16/9' }}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow("The CSS property 'aspect-ratio' isn't supported in HTML email strict mode.")
  })

  test('rejects position:fixed and position:sticky in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ position: 'fixed' }}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      "The CSS property 'position:fixed' isn't supported in HTML email strict mode.",
    )

    await expect(
      render(
        <html>
          <body>
            <div style={{ position: 'sticky' }}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      "The CSS property 'position:sticky' isn't supported in HTML email strict mode.",
    )
  })

  test('rejects advanced background properties in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ backgroundAttachment: 'fixed' }}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      "The CSS property 'background-attachment' isn't supported in HTML email strict mode.",
    )
  })

  test('warns about float and clear properties in strict mode', async () => {
    const { html, warnings } = await withWarnSpy(() =>
      render(
        <html>
          <body>
            <div style={{ float: 'left', clear: 'both' }}>Hello</div>
          </body>
        </html>,
      ),
    )

    expect(html).toContain('float:left')
    expect(html).toContain('clear:both')
    expect(warnings.some((message) => message.includes("The CSS property 'float'"))).toBe(true)
    expect(warnings.some((message) => message.includes("The CSS property 'clear'"))).toBe(true)
  })

  test('warns about object-fit and object-position instead of throwing', async () => {
    const { html, warnings } = await withWarnSpy(() =>
      render(
        <html>
          <body>
            <img
              alt="Hero"
              src="https://example.com/hero.png"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          </body>
        </html>,
      ),
    )

    expect(html).toContain('object-fit:cover')
    expect(html).toContain('object-position:center')
    expect(warnings.some((message) => message.includes("The CSS property 'object-fit'"))).toBe(true)
    expect(warnings.some((message) => message.includes("The CSS property 'object-position'"))).toBe(
      true,
    )
  })

  test('warns when @font-face is used in strict mode', async () => {
    const { warnings } = await withWarnSpy(() =>
      render(
        <html>
          <head>
            <style>
              {
                '@font-face { font-family: Test; src: url(https://example.com/test.woff2) format("woff2"); }'
              }
            </style>
          </head>
          <body>
            <p>Hello</p>
          </body>
        </html>,
      ),
    )

    expect(warnings.some((message) => message.includes("The CSS at-rule '@font-face'"))).toBe(true)
  })

  test('rejects anchor tags without href in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <a>Open</a>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      'The <a> tag is missing an href attribute. Use <Link href="..."> or <Button href="..."> with a real destination URL.',
    )
  })

  test('rejects anchor tags with empty href values in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <a href="   ">Open</a>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      'The <a> tag is missing an href attribute. Use <Link href="..."> or <Button href="..."> with a real destination URL.',
    )
  })

  test('rejects stylesheet links even when they are in head', async () => {
    await expect(
      render(
        <html>
          <head>
            <link rel="stylesheet" href="https://example.com/mail.css" />
          </head>
          <body>
            <p>Hello</p>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      'The <link rel="stylesheet"> tag isn\'t supported in HTML email strict mode. Move styles into <Head><style>...</style> instead.',
    )
  })

  test('rejects picture tags in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <picture>
              <img alt="Hero" src="https://example.com/hero.png" />
            </picture>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      "The <picture> tag isn't supported in HTML email strict mode. Use <Img> with a broadly supported fallback asset instead.",
    )
  })

  test('rejects source tags in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <source src="https://example.com/hero.avif" />
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      "The <source> tag isn't supported in HTML email strict mode. Use a single <Img> source instead of source switching.",
    )
  })

  test('handles single-quoted and unquoted attributes in raw validation paths', () => {
    expect(() =>
      validateHtml(
        "<html><head></head><body><a HREF=https://example.com>Open</a><img SRC=https://example.com/a.png ALT='Hero image' /></body></html>",
      ),
    ).not.toThrow()
  })

  test('rejects disallowed inline CSS when quoted attribute values include >', () => {
    expect(() =>
      validateHtml(
        '<html><head></head><body><div style="background:url(https://example.com/a>b);display:grid">Hello</div></body></html>',
      ),
    ).toThrow(
      "The CSS property 'display:grid' isn't supported in HTML email strict mode. Use <Section>, <Row>, <Column>, or table-based layout instead.",
    )
  })

  test('rejects stylesheet links when quoted href values include >', () => {
    expect(() =>
      validateHtml(
        '<html><head><link rel="stylesheet" href="https://example.com/a>b" /></head><body>Hello</body></html>',
      ),
    ).toThrow(
      'The <link rel="stylesheet"> tag isn\'t supported in HTML email strict mode. Move styles into <Head><style>...</style> instead.',
    )
  })

  test('validates Outlook conditional comment payloads', () => {
    expect(() =>
      validateHtml(
        '<html><body><!--[if mso]><form action="https://example.com"><input /></form><![endif]--><p>Hello</p></body></html>',
      ),
    ).toThrow(
      'The <form> tag isn\'t supported in HTML email strict mode. Use <Button href="..."> or <Link href="..."> for clickable actions instead.',
    )
  })

  test('ignores unsupported tags inside HTML comments', () => {
    expect(() =>
      validateHtml(
        '<html><body><!-- <form action="https://example.com"><input /></form> --><p>Hello</p></body></html>',
      ),
    ).not.toThrow()
  })
})
