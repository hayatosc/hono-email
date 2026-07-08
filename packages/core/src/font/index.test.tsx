import { describe, expect, test } from 'bun:test'

import { Body, Font, Head, Html, render } from '../index'

describe('Font', () => {
  test('renders global font-family rule with fallbacks', async () => {
    const { html } = await render(
      <Html>
        <Head>
          <Font fontFamily="Roboto" fallbackFontFamily={['Verdana', 'sans-serif']} />
        </Head>
        <Body>
          <p>Hello</p>
        </Body>
      </Html>,
    )

    expect(html).toContain(
      "<style data-hono-email-head=\"true\">* { font-family: 'Roboto', 'Verdana', sans-serif; }</style>",
    )
  })

  test('renders @font-face when webFont is provided', async () => {
    const { html } = await render(
      <Html>
        <Head>
          <Font
            fontFamily="Roboto"
            fallbackFontFamily="Verdana"
            fontWeight={400}
            fontStyle="normal"
            webFont={{
              url: 'https://fonts.gstatic.com/s/roboto/v27/roboto.woff2',
              format: 'woff2',
            }}
          />
        </Head>
        <Body>
          <p>Hello</p>
        </Body>
      </Html>,
      { strict: false },
    )

    expect(html).toContain("@font-face {font-family: 'Roboto';")
    expect(html).toContain(
      "src: url('https://fonts.gstatic.com/s/roboto/v27/roboto.woff2') format('woff2');",
    )
    expect(html).toContain("mso-font-alt: 'Verdana';")
    expect(html).toContain("* { font-family: 'Roboto', 'Verdana'; }")
  })

  test('escapes font css values so they cannot break out of the style tag', async () => {
    const { html } = await render(
      <Html>
        <Head>
          <Font
            fontFamily={'Bad</style><script>alert(1)</script>'}
            fallbackFontFamily="sans-serif"
            webFont={{
              url: "https://example.com/font.woff2');}</style><script>alert(1)</script>",
              format: 'woff2',
            }}
          />
        </Head>
        <Body>
          <p>Hello</p>
        </Body>
      </Html>,
      { strict: false },
    )

    expect(html).not.toContain('<script')
    expect(html).not.toContain('</style><script')
    expect(html).toContain('Bad\\3C /style\\3E \\3C script\\3E alert(1)\\3C /script\\3E')
    expect(html).toContain("src: url('https://example.com/font.woff2\\');}")
    expect(html).toContain('\\3C /style\\3E \\3C script\\3E alert(1)\\3C /script\\3E')
  })

  // Skipped because the Font component now renders with `<style data-hono-email-head="true">`,
  // which automatically relocates the style tag to the `<Head>` block at render time.
  // As a result, it will not trigger the strict-mode rejection warning.
  test.skip('is rejected outside head in strict mode (skipped due to automatic relocation)', async () => {
    await expect(
      render(
        <Html>
          <Body>
            <Font fontFamily="Inter" fallbackFontFamily="sans-serif" />
          </Body>
        </Html>,
      ),
    ).rejects.toThrow('The <style> tag must be placed inside <Head> in HTML email strict mode.')
  })
})
