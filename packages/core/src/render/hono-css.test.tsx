import { describe, expect, test } from 'bun:test'

import { Style, css, cx } from 'hono/css'

import {
  Body,
  Head,
  Html,
  Markdown,
  Tailwind,
  Text,
  buildTailwindArtifactFromCss,
  render,
} from '../index'

const StyledEmail = ({ includeStyle = true }: { includeStyle?: boolean } = {}) => {
  const titleClassName = css`
    color: #0f172a;
    padding-inline: 1rem;
    @media (width >= 40rem) {
      color: #3b82f6;
    }
  `

  return (
    <Html>
      <Head>{includeStyle ? <Style /> : null}</Head>
      <Body>
        <Text className={titleClassName}>Hello</Text>
      </Body>
    </Html>
  )
}

describe('hono/css integration', () => {
  test('inlines hono/css classes during render', async () => {
    const { html } = await render(<StyledEmail />)

    expect(html).not.toContain('id="hono-css"')
    expect(html).toContain('color:#0f172a')
    expect(html).toContain('padding-left:16px')
    expect(html).toContain('padding-right:16px')
    expect(html).toMatch(
      /<head[^>]*>[\s\S]*<style[^>]*data-hono-email-head="true"[^>]*>[\s\S]*@media[\s\S]*<\/style>[\s\S]*<\/head>/i,
    )
  })

  test('throws a clear error when hono/css is used without <Head><Style /></Head>', async () => {
    await expect(render(<StyledEmail includeStyle={false} />)).rejects.toThrow(
      'hono/css styles require <Head><Style /></Head> in hono-email.',
    )
  })

  test('accepts non-hono-css class names while applying hono/css inline styles', async () => {
    const className = cx(
      css`
        color: #111827;
      `,
      'custom-class',
    )

    const { html } = await render(
      <Html>
        <Head>
          <Style />
        </Head>
        <Body>
          <Text className={className}>Mixed classes</Text>
        </Body>
      </Html>,
    )

    expect(html).toContain('custom-class')
    expect(html).toContain('color:#111827')
  })

  test('requires hono/css Style to be inside Head', async () => {
    const className = css`
      color: #0f172a;
    `

    await expect(
      render(
        <Html>
          <Body>
            <Style />
            <Text className={className}>Hello</Text>
          </Body>
        </Html>,
      ),
    ).rejects.toThrow('must be inside <Head>')
  })

  test('coexists with Tailwind when hono/css classes are used inside <Tailwind>', async () => {
    const artifact = buildTailwindArtifactFromCss({
      css: `
@layer utilities {
  .text-brand { color: #0f172a; }
  .px-4 { padding-inline: 1rem; }
}
`,
    })
    const className = cx(
      css`
        background-color: #e2e8f0;
      `,
      'text-brand px-4',
    )

    const { html } = await render(
      <Html>
        <Head>
          <Style />
        </Head>
        <Tailwind artifact={artifact}>
          <Body>
            <Text className={className}>Mixed Tailwind and hono/css</Text>
          </Body>
        </Tailwind>
      </Html>,
    )

    expect(html).toContain('color:#0f172a')
    expect(html).toContain('padding-left:16px')
    expect(html).toContain('padding-right:16px')
    expect(html).toContain('background-color:#e2e8f0')
  })

  test('keeps markdown tailwind parent guard active while processing hono/css styles', async () => {
    const className = css`
      color: #0f172a;
    `

    await expect(
      render(
        <Html>
          <Head>
            <Style />
          </Head>
          <Body>
            <Text className={className}>Styled</Text>
            <Markdown markdownStyleMode="tailwind">{`
# Tailwind mode
            `}</Markdown>
          </Body>
        </Html>,
      ),
    ).rejects.toThrow('<Markdown markdownStyleMode="tailwind"> requires a <Tailwind> parent.')
  })
})
