import { describe, expect, test } from 'bun:test'

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
  render,
} from '../../src'

describe('email components', () => {
  test('renders a basic email document with primitives', async () => {
    const { html } = await render(
      <Html lang="ja">
        <Head>
          <title>Welcome</title>
        </Head>
        <Preview>Preview text</Preview>
        <Body>
          <Container>
            <Heading as="h2">Hello</Heading>
            <Text>World</Text>
            <Section>
              <Row>
                <Column>One</Column>
                <Column>Two</Column>
              </Row>
            </Section>
          </Container>
        </Body>
      </Html>,
    )

    expect(html).toContain('<html lang="ja">')
    expect(html).toContain('<title>Welcome</title>')
    expect(html).toContain('Preview text')
    expect(html).toContain('<h2 style="">Hello</h2>')
    expect(html).toContain(
      '<p style="font-size:14px;line-height:24px;margin-top:16px;margin-bottom:16px">World</p>',
    )
    expect(html).toContain('<td>One</td>')
    expect(html).toContain('<td>Two</td>')
  })

  test('renders Button as a link with email-safe defaults', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Button href="https://example.com" style={{ padding: '12px 20px' }}>
            Start
          </Button>
        </Body>
      </Html>,
    )

    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('mso-padding-alt:0px')
    expect(html).toContain('padding-top:12px')
    expect(html).toContain('padding-right:20px')
    expect(html).toContain('Start')
    expect(html).not.toContain('<button')
  })

  test('renders Link and preserves href with default target', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Link href="https://example.com/docs">Docs</Link>
        </Body>
      </Html>,
    )

    expect(html).toContain('<a href="https://example.com/docs" target="_blank">Docs</a>')
  })

  test('renders Hr with default divider styles', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Hr />
        </Body>
      </Html>,
    )

    expect(html).toContain('<hr style="width:100%;border:none;border-top:1px solid #eaeaea"/>')
  })

  test('applies Heading margin shorthand props', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Heading as="h3" mx={12} mt="8">
            Hello
          </Heading>
        </Body>
      </Html>,
    )

    expect(html).toContain(
      '<h3 style="margin-left:12px;margin-right:12px;margin-top:8px">Hello</h3>',
    )
  })
})
