import { describe, expect, test } from 'bun:test'

import { Body, Head, Html, Preview, render } from '../index'

describe('document semantics', () => {
  test('moves Preview content to the top of the body', async () => {
    const { html } = await render(
      <Html>
        <Head>
          <title>Welcome</title>
        </Head>
        <Preview>Hidden preview</Preview>
        <Body>
          <p>Hello</p>
        </Body>
      </Html>,
    )

    expect(html).toContain('<title>Welcome</title></head><body>')
    expect(html).toContain('data-hono-email-preview="true"')
    expect(html).toContain('<body><div data-hono-email-preview="true"')
    expect(html).toContain('</div><p>Hello</p></body>')
  })

  test('handles nested divs in Preview content correctly', async () => {
    const { html } = await render(
      <Html>
        <Preview>
          <div>
            <span>Nested 1</span>
            <div>Nested 2</div>
          </div>
        </Preview>
        <Body>
          <p>Hello</p>
        </Body>
      </Html>,
    )

    expect(html).toContain('<body><div data-hono-email-preview="true"')
    expect(html).toContain('Nested 1')
    expect(html).toContain('Nested 2')
    expect(html).toContain('</div></div>')
    expect(html).toContain('Hello')
  })

  test('pads preview text so following content stays out of the inbox snippet', async () => {
    const { html } = await render(
      <Html>
        <Preview>Short preview</Preview>
        <Body>
          <p>Hello</p>
        </Body>
      </Html>,
    )

    expect(html).toContain('\u200c')
  })

  test('keeps preview hidden styles intact after relocation', async () => {
    const { html } = await render(
      <Html>
        <Preview>Preview text</Preview>
        <Body>
          <p>Hello</p>
        </Body>
      </Html>,
    )

    expect(html).toContain('display:none')
    expect(html).toContain('max-height:0px')
    expect(html).toContain('opacity:0')
  })
})
