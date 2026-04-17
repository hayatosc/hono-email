import { describe, expect, test } from 'bun:test'

import { Body, Head, Html, Markdown, render } from '../../src'

describe('Markdown', () => {
  test('renders markdown tables and safe raw html', async () => {
    const html = await render(
      <Html>
        <Head />
        <Body>
          <Markdown>{`
# Hello

| Name | Role |
| --- | --- |
| Taro | Builder |

<div><a href="https://example.com">Safe raw link</a></div>
          `}</Markdown>
        </Body>
      </Html>
    )

    expect(html).toContain('<h1')
    expect(html).toContain('<table')
    expect(html).toContain('Safe raw link')
    expect(html).toContain('href="https://example.com"')
  })

  test('sanitizes unsafe raw html and applies custom styles', async () => {
    const html = await render(
      <Html>
        <Head />
        <Body>
          <Markdown
            markdownContainerStyles={{
              padding: '12px',
              border: '1px solid #111827',
            }}
            markdownCustomStyles={{
              h1: { color: '#dc2626' },
              p: { margin: '0' },
              codeInline: {
                backgroundColor: '#e5e7eb',
                padding: '2px 4px',
              },
            }}
          >{`
# Styled

Paragraph with \`code\`

<script>alert('xss')</script>
          `}</Markdown>
        </Body>
      </Html>
    )

    expect(html).toContain('padding:12px')
    expect(html).toContain('border:1px solid #111827')
    expect(html).toContain('color:#dc2626')
    expect(html).toContain('background-color:#e5e7eb')
    expect(html).not.toContain('<script')
    expect(html).not.toContain("alert('xss')")
  })

  test('allows opting out of sanitization', async () => {
    const html = await render(
      <Html>
        <Head />
        <Body>
          <Markdown sanitize={false}>{`
# Unsafe

<script>alert('xss')</script>
          `}</Markdown>
        </Body>
      </Html>,
      { strict: false }
    )

    expect(html).toContain('<script>alert(\'xss\')</script>')
  })
})
