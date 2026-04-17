import { describe, expect, test } from 'bun:test'

import { render, renderPretty, renderWithWarnings } from '../../src'

describe('render warnings', () => {
  test('collects warnings for tier 2 CSS declarations', async () => {
    const result = await renderWithWarnings(
      <html>
        <body>
          <div style={{ display: 'flex', position: 'relative' }}>Hello</div>
        </body>
      </html>
    )

    expect(result.html).toContain('display:flex')
    expect(result.warnings).toContain(
      "The CSS property 'display:flex' may not be supported consistently across email clients. Prefer <Section>, <Row>, <Column>, or table-based layout for critical structure."
    )
    expect(result.warnings).toContain(
      "The CSS property 'position' may not be supported consistently across email clients. Prefer table structure, spacing, and natural document flow instead of positional offsets."
    )
  })

  test('collects warnings for risky CSS inside style tags', async () => {
    const result = await renderWithWarnings(
      <html>
        <head>
          <style>{'@media screen and (max-width: 600px) { .hero { background-image: url(https://example.com/hero.png); } }'}</style>
        </head>
        <body>
          <div class='hero'>Hello</div>
        </body>
      </html>
    )

    expect(result.warnings).toContain(
      "The CSS at-rule '@media' may not be supported consistently across email clients. Keep the base layout readable without media queries."
    )
    expect(result.warnings).toContain(
      "The CSS property 'background-image' may not be supported consistently across email clients. Prefer <Img> or a solid background color for essential content."
    )
  })

  test('warns when img is missing alt text', async () => {
    const result = await renderWithWarnings(
      <html>
        <body>
          <img src='https://example.com/hero.png' />
        </body>
      </html>
    )

    expect(result.warnings).toContain(
      "The <img> tag is missing an alt attribute. Add alt text for meaningful images, or use alt=\"\" for decorative images."
    )
  })

  test('render keeps string-only API', async () => {
    const html = await render(
      <html>
        <body>
          <div style={{ display: 'flex' }}>Hello</div>
        </body>
      </html>
    )

    expect(typeof html).toBe('string')
  })
})

describe('renderPretty formatting', () => {
  test('formats output with line breaks and indentation', async () => {
    const html = await renderPretty(
      <html>
        <body>
          <div>
            <p>Hello</p>
          </div>
        </body>
      </html>
    )

    expect(html).toContain('\n<html>')
    expect(html).toContain('\n  <body>')
    expect(html).toContain('\n    <div>')
    expect(html).toContain('\n      <p>Hello</p>')
  })
})
