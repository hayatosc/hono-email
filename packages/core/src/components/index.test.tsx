import { describe, expect, test } from 'bun:test'

import {
  Body,
  Box,
  Button,
  Card,
  CodeBlock,
  CodeInline,
  Column,
  ColorScheme,
  Conditional,
  Container,
  Flex,
  Grid,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  LinkButton,
  List,
  ListItem,
  Preview,
  Row,
  Section,
  Spacer,
  Text,
  render,
} from '../index'

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

  test('renders LinkButton as a link with email-safe defaults', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <LinkButton href="https://example.com" style={{ padding: '12px 20px' }}>
            Start
          </LinkButton>
        </Body>
      </Html>,
    )

    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('mso-padding-alt:0px')
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

  test('renders Box and Spacer layout helpers', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Box as="td" style={{ padding: '12px' }}>
            Content
          </Box>
          <Spacer height={24} />
        </Body>
      </Html>,
    )

    expect(html).toContain('<td style="padding:12px">Content</td>')
    expect(html).toContain(
      '<div aria-hidden="true" style="font-size:0px;line-height:0px;height:24px;width:100%">',
    )
  })

  test('renders Flex as table-based row layout', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Flex align="middle" gap={12} justify="center">
            <Text>A</Text>
            <Text>B</Text>
          </Flex>
        </Body>
      </Html>,
    )

    expect(html).toContain('<table border="0" cellPadding="0" cellSpacing="0" role="presentation"')
    expect(html).toContain('align="center"')
    expect(html).toContain('valign="middle"')
    expect(html).toContain('width="12px"')
    expect(html).not.toContain('display:flex')
  })

  test('renders Flex as table-based column layout', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Flex direction="column" gap="8px">
            <Text>A</Text>
            <Text>B</Text>
          </Flex>
        </Body>
      </Html>,
    )

    expect(html).toContain('<td height="8px" style="font-size:0px;line-height:0px">')
    expect(html).toContain('<td valign="top">')
  })

  test('renders Grid as a table with fixed column cells and spacer gaps', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Grid columns={2} gap={16}>
            <Text>One</Text>
            <Text>Two</Text>
            <Text>Three</Text>
          </Grid>
        </Body>
      </Html>,
    )

    expect(html).toContain(
      '<table border="0" cellPadding="0" cellSpacing="0" role="presentation" width="100%"',
    )
    expect(html).toContain('width="50%"')
    expect(html).toContain('width="16px"')
    expect(html).toContain('colSpan="3" height="16px"')
    expect(html).not.toContain('display:grid')
  })

  test('renders Card as a bordered table container', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Card borderColor="#d1d5db" padding={20}>
            <Text>Inside</Text>
          </Card>
        </Body>
      </Html>,
    )

    expect(html).toContain(
      '<table border="0" cellPadding="0" cellSpacing="0" role="presentation" width="100%"',
    )
    expect(html).toContain(
      '<td style="background-color:#ffffff;border:1px solid #d1d5db;padding:20px">',
    )
    expect(html).toContain('Inside')
  })

  test('renders code components with email-safe defaults', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Text>
            Run <CodeInline>bun test</CodeInline>
          </Text>
          <CodeBlock>{'const ok = true'}</CodeBlock>
        </Body>
      </Html>,
    )

    expect(html).toContain('<code style="background-color:#f3f4f6')
    expect(html).toContain('bun test</code>')
    expect(html).toContain('<pre style="background-color:#f3f4f6')
    expect(html).toContain('const ok = true</pre>')
  })

  test('renders List and ListItem with spacing defaults', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <List marker="decimal" ordered>
            <ListItem>First</ListItem>
            <ListItem style={{ marginBottom: 0 }}>Second</ListItem>
          </List>
        </Body>
      </Html>,
    )

    expect(html).toContain('<ol style="margin:16px 0;padding-left:24px;list-style-type:decimal">')
    expect(html).toContain(
      '<li style="font-size:14px;line-height:24px;margin-bottom:8px">First</li>',
    )
    expect(html).toContain(
      '<li style="font-size:14px;line-height:24px;margin-bottom:0px">Second</li>',
    )
  })

  test('renders Outlook conditional content', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Conditional>
            <table>
              <tbody>
                <tr>
                  <td>Only Outlook</td>
                </tr>
              </tbody>
            </table>
          </Conditional>
          <Conditional notMso>
            <Text>Not Outlook</Text>
          </Conditional>
        </Body>
      </Html>,
    )

    expect(html).toContain('<!--[if mso]><table>')
    expect(html).toContain('<td>Only Outlook</td>')
    expect(html).toContain('<![endif]-->')
    expect(html).toContain('<!--[if !mso]><!-->')
    expect(html).toContain('Not Outlook')
    expect(html).toContain('<!--<![endif]-->')
  })

  test('renders ColorScheme metadata for Head', async () => {
    const { html } = await render(
      <Html>
        <Head>
          <ColorScheme colorScheme="light" />
        </Head>
      </Html>,
    )

    expect(html).toContain('<meta name="color-scheme" content="light"/>')
    expect(html).toContain('<meta name="supported-color-schemes" content="light"/>')
    expect(html).toContain(
      '<style>:root { color-scheme: light; supported-color-schemes: light; }</style>',
    )
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

  test('Preview counts text in nested JSX elements for padding', async () => {
    const { html } = await render(
      <Html>
        <Body>
          <Preview>
            <span>Your</span> <span>receipt</span>
          </Preview>
        </Body>
      </Html>,
    )

    expect(html).toContain('Your')
    expect(html).toContain('receipt')
    // Preview pads the hidden preview text to ~200 characters so clients render
    // the intended preview snippet. The padding includes zero-width joiners and
    // other invisible whitespace characters.
    expect(html).toContain('\u200c')
    expect(html).toContain('\ufeff')
  })
})
