import { describe, expect, test } from 'bun:test'

import { Body, Font, Head, Html, render } from '../../src'

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

    expect(html).toContain("<style>* { font-family: 'Roboto', 'Verdana', sans-serif; }</style>")
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
    )

    expect(html).toContain("@font-face {font-family: 'Roboto';")
    expect(html).toContain(
      "src: url(https://fonts.gstatic.com/s/roboto/v27/roboto.woff2) format('woff2');",
    )
    expect(html).toContain("mso-font-alt: 'Verdana';")
    expect(html).toContain("* { font-family: 'Roboto', 'Verdana'; }")
  })

  test('is rejected outside head in strict mode', async () => {
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
