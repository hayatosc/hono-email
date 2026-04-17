import { Body, Head, Html, Markdown, render } from '../../src'

const html = await render(
  <Html lang='en'>
    <Head>
      <title>Markdown example</title>
    </Head>
    <Body>
      <Markdown
        markdownContainerStyles={{
          padding: '12px',
          border: '1px solid #111827',
        }}
        markdownCustomStyles={{
          h1: { color: '#dc2626' },
          codeInline: {
            backgroundColor: '#e5e7eb',
            padding: '2px 4px',
          },
        }}
      >{`
# Markdown email

| Name | Role |
| --- | --- |
| Taro | Builder |

Inline \`code\` and a <a href="https://example.com">safe raw link</a>.
      `}</Markdown>
    </Body>
  </Html>
)

console.log(html)
