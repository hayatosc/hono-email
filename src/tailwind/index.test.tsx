import { describe, expect, test } from 'bun:test'

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

const PRECOMPILED_TAILWIND_CSS = `
@layer utilities {
  .text-brand { color: #0f172a; }
  .bg-brand { background-color: #0f172a; }
  .text-slate-900 { color: #0f172a; }
  .sm\\:text-blue-500 { @media (width >= 40rem) { color: #3b82f6; } }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .font-semibold { font-weight: 600; }
  .tracking-wide { letter-spacing: 0.025em; }
  .underline { text-decoration-line: underline; }
  .border { border-style: solid; border-width: 1px; }
  .border-slate-300 { border-color: #cbd5e1; }
  .rounded-lg { border-radius: 0.5rem; }
  .w-24 { width: 6rem; }
  .h-10 { height: 2.5rem; }
  .px-4 { padding-inline: 1rem; }
  .py-2 { padding-block: 0.5rem; }
}
`

describe('Tailwind', () => {
  test('applies precompiled utilities as inline styles on html elements', async () => {
    const artifact = buildTailwindArtifactFromCss({
      css: PRECOMPILED_TAILWIND_CSS,
    })

    const { html } = await render(
      <Html>
        <Head />
        <Tailwind artifact={artifact}>
          <Body>
            <Text className="text-brand bg-brand px-4 py-2">Hello</Text>
          </Body>
        </Tailwind>
      </Html>,
    )

    expect(html).toContain('color:#0f172a')
    expect(html).toContain('background-color:#0f172a')
    expect(html).toContain('padding-left:16px')
    expect(html).toContain('padding-right:16px')
    expect(html).toContain('padding-top:8px')
    expect(html).toContain('padding-bottom:8px')
  })

  test('moves precompiled media query styles into head', async () => {
    const artifact = buildTailwindArtifactFromCss({
      css: PRECOMPILED_TAILWIND_CSS,
    })

    const { html } = await render(
      <Html>
        <Head />
        <Tailwind artifact={artifact}>
          <Body>
            <Text className="text-slate-900 sm:text-blue-500">Hello</Text>
          </Body>
        </Tailwind>
      </Html>,
    )

    expect(html).toMatch(
      /<head[^>]*>[\s\S]*<style[^>]*>[\s\S]*@media[\s\S]*<\/style>[\s\S]*<\/head>/i,
    )
  })

  test('supports typography, border, tracking, and sizing utilities from precompiled css', async () => {
    const artifact = buildTailwindArtifactFromCss({
      css: PRECOMPILED_TAILWIND_CSS,
    })

    const { html } = await render(
      <Html>
        <Head />
        <Tailwind artifact={artifact}>
          <Body>
            <Text className="text-2xl font-semibold tracking-wide underline border border-slate-300 rounded-lg w-24 h-10 px-4 py-2">
              Hello
            </Text>
          </Body>
        </Tailwind>
      </Html>,
    )

    expect(html).toContain('font-size:24px')
    expect(html).toContain('line-height:32px')
    expect(html).toContain('font-weight:600')
    expect(html).toContain('letter-spacing:0.025em')
    expect(html).toContain('text-decoration:underline')
    expect(html).toContain('border-style:solid')
    expect(html).toContain('border-width:1px')
    expect(html).toContain('border-color:#cbd5e1')
    expect(html).toContain('border-radius:8px')
    expect(html).toContain('width:96px')
    expect(html).toContain('height:40px')
  })

  test('throws when artifact is missing', async () => {
    await expect(
      render(
        <Html>
          <Head />
          <Tailwind>
            <Body>
              <Text className="text-blue-500">Hello</Text>
            </Body>
          </Tailwind>
        </Html>,
      ),
    ).rejects.toThrow('<Tailwind> requires a build artifact.')
  })

  test('supports Vite-like precompiled Tailwind CSS artifacts', async () => {
    const artifact = buildTailwindArtifactFromCss({
      css: `
@layer utilities {
  .text-brand { color: #0f172a; }
  .px-4 { padding-inline: 1rem; }
  .py-2 { padding-block: 0.5rem; }
  .sm\\:text-blue-500 { @media (width >= 40rem) { color: #3b82f6; } }
}
`,
    })

    const { html } = await render(
      <Html>
        <Head />
        <Tailwind artifact={artifact}>
          <Body>
            <Text className="text-brand px-4 py-2 sm:text-blue-500">Hello</Text>
          </Body>
        </Tailwind>
      </Html>,
    )

    expect(html).toContain('color:#0f172a')
    expect(html).toContain('padding-left:16px')
    expect(html).toContain('padding-right:16px')
    expect(html).toContain('padding-top:8px')
    expect(html).toContain('padding-bottom:8px')
    expect(html).toMatch(
      /<head[^>]*>[\s\S]*<style[^>]*>[\s\S]*@media[\s\S]*<\/style>[\s\S]*<\/head>/i,
    )
  })

  test('builds artifacts with normalized variables, colors, and logical properties', () => {
    const artifact = buildTailwindArtifactFromCss({
      css: `
@property --color-brand {
  syntax: "<color>";
  inherits: false;
  initial-value: oklch(55% 0.2 260);
}

@layer theme {
  :root {
    --spacing-card: 1.25rem;
  }
}

@layer utilities {
  .card {
    border-width: 1px;
    color: rgb(15 23 42 / 100%);
    margin-inline: var(--spacing-card);
  }
  .sm\\:card {
    @media (width >= 40rem) {
      background-color: var(--color-brand);
    }
  }
}
`,
    })

    expect(artifact.inlineStylesByClass.card).toEqual({
      'border-style': 'solid',
      'border-width': '1px',
      color: '#0f172a',
      'margin-left': '20px',
      'margin-right': '20px',
    })
    expect(artifact.headCssByClass['sm:card']).toContain('@media (min-width:640px)')
    expect(artifact.headCssByClass['sm:card']).not.toContain('var(')
  })

  test('keeps pseudo-class variants in head with renamed email-safe class names', async () => {
    const artifact = buildTailwindArtifactFromCss({
      css: `
@layer utilities {
  .bg-brand { background-color: #0f172a; }
  .hover\\:bg-blue-500:hover { background-color: #3b82f6; }
}
`,
    })

    expect(artifact.renamedClasses['hover:bg-blue-500']).toBe('hover-bg-blue-500')

    const { html } = await render(
      <Html>
        <Head />
        <Tailwind artifact={artifact}>
          <Body>
            <Text className="bg-brand hover:bg-blue-500">Hello</Text>
          </Body>
        </Tailwind>
      </Html>,
    )

    expect(html).toContain('background-color:#0f172a')
    expect(html).toContain('hover-bg-blue-500')
    expect(html).not.toContain('hover:bg-blue-500')
    expect(html).toContain('.hover-bg-blue-500:hover{background-color:#3b82f6 !important}')
  })

  test('drops unsupported combinator variants without throwing', async () => {
    const artifact = buildTailwindArtifactFromCss({
      css: `
@layer utilities {
  .text-brand { color: #0f172a; }
  .group:hover .group-hover\\:text-white { color: #ffffff; }
}
`,
    })

    expect(artifact.classes).toContain('group-hover:text-white')
    expect(artifact.inlineStylesByClass['group-hover:text-white']).toBeUndefined()

    const { html } = await render(
      <Html>
        <Head />
        <Tailwind artifact={artifact}>
          <Body>
            <Text className="text-brand group-hover:text-white">Hello</Text>
          </Body>
        </Tailwind>
      </Html>,
    )

    expect(html).toContain('color:#0f172a')
    expect(html).not.toContain('color:#ffffff')
  })

  test('applies Tailwind classes generated by Markdown in tailwind mode', async () => {
    const artifact = buildTailwindArtifactFromCss({
      css: `
@layer utilities {
  .markdown-container { color: #0f172a; }
  .markdown-h1 { font-size: 1.5rem; line-height: 2rem; font-weight: 600; }
  .markdown-p { margin-bottom: 0.75rem; }
  .markdown-code-inline { background-color: #e2e8f0; padding: 2px 4px; }
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
              markdownContainerClassName="markdown-container"
              markdownCustomClassNames={{
                h1: 'markdown-h1',
                p: 'markdown-p',
                codeInline: 'markdown-code-inline',
              }}
            >{`
# Tailwind Markdown

Paragraph with \`code\`
            `}</Markdown>
          </Body>
        </Tailwind>
      </Html>,
    )

    expect(html).toContain('color:#0f172a')
    expect(html).toContain('font-size:24px')
    expect(html).toContain('line-height:32px')
    expect(html).toContain('font-weight:600')
    expect(html).toContain('background-color:#e2e8f0')
    expect(html).not.toContain('font-size:30px')
    expect(html).not.toContain('line-height:36px')
  })
})
