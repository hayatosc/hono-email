import { describe, expect, spyOn, test } from 'bun:test'

import { render, type RenderResult } from '../index'
import { validateHtml } from './html'

const withWarnSpy = async (
  run: () => Promise<RenderResult>,
): Promise<{ html: string; warnings: string[] }> => {
  const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})

  try {
    const { html } = await run()
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
    ).rejects.toThrow("The <form> tag isn't supported in HTML email strict mode.")
  })

  test('allows unsupported tags when strict mode is disabled', async () => {
    const { html } = await render(
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
    const { html } = await render(
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

  test('rejects grid-template-columns in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <div style={{ gridTemplateColumns: '1fr 1fr' }}>Hello</div>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      "The CSS property 'grid-template-columns' isn't supported in HTML email strict mode.",
    )
  })

  test('allows display:grid in strict mode', async () => {
    const { html } = await render(
      <html>
        <body>
          <div style={{ display: 'grid' }}>Hello</div>
        </body>
      </html>,
    )

    expect(html).toContain('display:grid')
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
      "The CSS property 'padding-inline' isn't supported in HTML email strict mode.",
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

  test('warns about box-shadow and calc in strict mode', async () => {
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

  test('allows position:fixed and position:sticky in strict mode', async () => {
    const { html } = await render(
      <html>
        <body>
          <div style={{ position: 'fixed' }}>Hello</div>
        </body>
      </html>,
    )

    expect(html).toContain('position:fixed')
  })

  test('allows float and clear properties in strict mode', async () => {
    const { html } = await render(
      <html>
        <body>
          <div style={{ float: 'left', clear: 'both' }}>Hello</div>
        </body>
      </html>,
    )

    expect(html).toContain('float:left')
    expect(html).toContain('clear:both')
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

  test('rejects @font-face in strict mode', async () => {
    await expect(
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
    ).rejects.toThrow(
      "The CSS at-rule '@font-face' isn't supported reliably in HTML email strict mode.",
    )
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

  test('rejects unsafe href URL schemes in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <a href="java&#x73;cript:alert(1)">Open</a>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      "The a href uses the unsafe 'javascript:' URL scheme. Use http, https, mailto, tel, or a relative URL instead.",
    )
  })

  test('warns about caniemail-limited image attributes and base64 image sources', async () => {
    const { warnings } = await withWarnSpy(() =>
      render(
        <html>
          <body>
            <img
              alt="Hero"
              src="data:image/png;base64,iVBORw0KGgo="
              srcset="https://example.com/hero@2x.png 2x"
              sizes="100vw"
            />
          </body>
        </html>,
      ),
    )

    expect(warnings.some((message) => message.includes('Base64 image data URLs'))).toBe(true)
    expect(warnings.some((message) => message.includes('img srcset and sizes'))).toBe(true)
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

  test('rejects keyframes in strict mode', async () => {
    await expect(
      render(
        <html>
          <head>
            <style>{'@keyframes fade { from { opacity: 0 } to { opacity: 1 } }'}</style>
          </head>
          <body>
            <p>Hello</p>
          </body>
        </html>,
      ),
    ).rejects.toThrow(
      "The CSS at-rule '@keyframes' isn't supported reliably in HTML email strict mode.",
    )
  })

  test('warns about caniemail-limited flex properties and supports queries', async () => {
    const { warnings } = await withWarnSpy(() =>
      render(
        <html>
          <head>
            <style>{'@supports (display: flex) { .x { color: red; } }'}</style>
          </head>
          <body>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              Hello
            </div>
          </body>
        </html>,
      ),
    )

    expect(warnings.some((message) => message.includes("The CSS at-rule '@supports'"))).toBe(true)
    expect(warnings.some((message) => message.includes("The CSS property 'flex-direction'"))).toBe(
      true,
    )
    expect(warnings.some((message) => message.includes("The CSS property 'justify-content'"))).toBe(
      true,
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
    ).rejects.toThrow("The <picture> tag isn't supported in HTML email strict mode.")
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
    ).rejects.toThrow("The <source> tag isn't supported in HTML email strict mode.")
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
    ).not.toThrow()
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
    ).toThrow("The <form> tag isn't supported in HTML email strict mode.")
  })

  test('ignores unsupported tags inside HTML comments', () => {
    expect(() =>
      validateHtml(
        '<html><body><!-- <form action="https://example.com"><input /></form> --><p>Hello</p></body></html>',
      ),
    ).not.toThrow()
  })

  test('deduplicates warnings collected from style attributes and style tags', () => {
    const warnings = validateHtml(
      '<html><head><style>.hero{box-shadow:0 1px 2px #000}</style></head><body><p style="box-shadow:0 1px 2px #000">Hello</p></body></html>',
    )

    expect(
      warnings.filter((message) => message.includes("The CSS property 'box-shadow'")),
    ).toHaveLength(1)
  })

  test('decodes hex HTML entities in href attributes', () => {
    expect(() =>
      validateHtml(
        '<html><body><a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3A;alert(1)">Open</a></body></html>',
      ),
    ).toThrow("unsafe 'javascript:' URL scheme")
  })

  test('decodes decimal HTML entities in href attributes', () => {
    expect(() =>
      validateHtml(
        '<html><body><a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">Open</a></body></html>',
      ),
    ).toThrow("unsafe 'javascript:' URL scheme")
  })

  test('decodes named colon entity in href attributes', () => {
    expect(() =>
      validateHtml('<html><body><a href="javascript&colon;alert(1)">Open</a></body></html>'),
    ).toThrow("unsafe 'javascript:' URL scheme")
  })

  test('rejects data URL in anchor href', async () => {
    await expect(
      render(
        <html>
          <body>
            <a href="data:text/html,<h1>Hi</h1>">Open</a>
          </body>
        </html>,
      ),
    ).rejects.toThrow("unsafe 'data:' URL scheme")
  })

  test('rejects javascript URL in CSS background-image', () => {
    expect(() =>
      validateHtml(
        "<html><head><style>body { background: url('javascript:alert(1)') }</style></head><body><p>Hello</p></body></html>",
      ),
    ).toThrow("unsafe 'javascript:' URL scheme")
  })

  test('warns about data URL in CSS background-image', () => {
    const warnings = validateHtml(
      "<html><head><style>body { background: url('data:image/png,abc') }</style></head><body><p>Hello</p></body></html>",
    )

    expect(warnings.some((m) => m.includes('data URL'))).toBe(true)
  })
})
