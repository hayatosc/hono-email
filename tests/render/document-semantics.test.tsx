import { describe, expect, test } from 'bun:test'

import { Body, Head, Html, Preview, render } from '../../src'

describe('document semantics', () => {
  test('moves Preview content to the top of the body', async () => {
    const html = await render(
      <Html>
        <Head>
          <title>Welcome</title>
        </Head>
        <Preview>Hidden preview</Preview>
        <Body>
          <p>Hello</p>
        </Body>
      </Html>
    )

    expect(html).toContain('<head><title>Welcome</title></head><body>')
    expect(html).toContain('data-hono-email-preview="true"')
    expect(html).toContain('<body><div data-hono-email-preview="true"')
    expect(html).toContain('</div><p>Hello</p></body>')
  })

  test('keeps preview hidden styles intact after relocation', async () => {
    const html = await render(
      <Html>
        <Preview>Preview text</Preview>
        <Body>
          <p>Hello</p>
        </Body>
      </Html>
    )

    expect(html).toContain('display:none')
    expect(html).toContain('max-height:0px')
    expect(html).toContain('opacity:0')
  })
})
