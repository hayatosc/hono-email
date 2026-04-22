import { describe, expect, test } from 'bun:test'

import {
  Body,
  Head,
  Html,
  Markdown,
  Tailwind,
  buildTailwindArtifactFromCss,
  render,
} from '../../src'

describe('Markdown', () => {
  test('renders markdown tables and safe raw html', async () => {
    const { html } = await render(
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
      </Html>,
    )

    expect(html).toContain('<h1')
    expect(html).toContain('<table')
    expect(html).toContain('Safe raw link')
    expect(html).toContain('href="https://example.com"')
  })

  test('sanitizes unsafe raw html and applies custom styles', async () => {
    const { html } = await render(
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
      </Html>,
    )

    expect(html).toContain('padding:12px')
    expect(html).toContain('border:1px solid #111827')
    expect(html).toContain('color:#dc2626')
    expect(html).toContain('background-color:#e5e7eb')
    expect(html).not.toContain('<script')
    expect(html).not.toContain("alert('xss')")
  })

  test('allows opting out of sanitization', async () => {
    const { html } = await render(
      <Html>
        <Head />
        <Body>
          <Markdown sanitize={false}>{`
# Unsafe

<script>alert('xss')</script>
          `}</Markdown>
        </Body>
      </Html>,
      { strict: false },
    )

    expect(html).toContain("<script>alert('xss')</script>")
  })

  test('supports class-based markdown styling mode without default inline styles', async () => {
    const artifact = buildTailwindArtifactFromCss({
      css: `
@layer utilities {
  .md-root { color: #0f172a; }
  .md-h1 { font-size: 1.25rem; line-height: 1.75rem; }
  .md-p { margin-bottom: 0.75rem; }
  .md-code { background-color: #e2e8f0; padding: 2px 4px; }
}
`,
    })

    const { html } = await render(
      <Html>
        <Head />
        <Tailwind artifact={artifact}>
          <Body>
            <Markdown
              markdownStyleMode="tailwind"
              markdownContainerClassName="md-root"
              markdownCustomClassNames={{
                h1: 'md-h1',
                p: 'md-p',
                codeInline: 'md-code',
              }}
            >{`
# Class based

Paragraph with \`code\`
            `}</Markdown>
          </Body>
        </Tailwind>
      </Html>,
    )

    expect(html).toContain('class="md-root"')
    expect(html).toContain('class="md-h1"')
    expect(html).toContain('class="md-p"')
    expect(html).toContain('class="md-code"')
    expect(html).not.toContain('font-size:30px')
    expect(html).not.toContain('line-height:36px')
    expect(html).not.toContain('background-color:#f1f5f9')
  })

  test('throws when tailwind markdown mode is used without a Tailwind parent', async () => {
    await expect(
      render(
        <Html>
          <Head />
          <Body>
            <Markdown markdownStyleMode="tailwind">{`
# Tailwind mode
            `}</Markdown>
          </Body>
        </Html>,
      ),
    ).rejects.toThrow('<Markdown markdownStyleMode="tailwind"> requires a <Tailwind> parent.')
  })

  test('sanitizes dangerous attributes, urls, and styles while keeping safe content', async () => {
    const { html } = await render(
      <Html>
        <Head />
        <Body>
          <Markdown>{`
<div onclick="alert('xss')" style="color: red; background-image: url(https://bad.test/x.png); /*x*/ width: 100%">
  <custom-tag><a href=" jAvascript:alert(1)" target="_blank" rel="external noopener" title="safe">Click</a></custom-tag>
  <a href="https://example.com" target="_blank" rel="external nofollow">Safe Link</a>
  <img src="//evil.example/image.png" onerror="alert(1)" width="100%" height="240" />
  <table role="presentation" cellpadding="8" cellspacing="4" border="1" align="center"><tr><td colspan="2" rowspan="3">Cell</td></tr></table>
</div>
          `}</Markdown>
        </Body>
      </Html>,
    )

    expect(html).not.toContain('onclick=')
    expect(html).not.toContain('onerror=')
    expect(html).not.toContain('javascript:alert')
    expect(html).not.toContain('style="color: red; background-image')
    expect(html).not.toContain('<custom-tag')
    expect(html).toContain('\n  Click\n')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="external nofollow"')
    expect(html).toContain('<img')
    expect(html).not.toContain('onerror=')
    expect(html).toContain('role="presentation"')
    expect(html).toContain('cellpadding="8"')
    expect(html).toContain('colspan="2"')
    expect(html).toContain('Cell')
  })

  test('drops unsafe attribute values and removes comments', async () => {
    const { html } = await render(
      <Html>
        <Head />
        <Body>
          <Markdown>{`
<!-- remove me -->
<a href="?tab=welcome" name="valid-anchor" target="popup" rel="noopener nonsense">Query Link</a>
<img src="/safe.png" width="100vw" height="auto" />
<td align="middle" colspan="2.5">Bad values</td>
<span style="be/**/havior:url(test.htc); color: blue">Styled</span>
          `}</Markdown>
        </Body>
      </Html>,
    )

    expect(html).not.toContain('remove me')
    expect(html).toContain('href="?tab=welcome"')
    expect(html).toContain('name="user-content-valid-anchor"')
    expect(html).toContain('target="popup"')
    expect(html).toContain('rel="noopener nonsense"')
    expect(html).toContain('width="100vw"')
    expect(html).toContain('height="auto"')
    expect(html).not.toContain('style="be/**/havior:url(test.htc); color: blue"')
    expect(html).toContain('Styled')
  })
})
