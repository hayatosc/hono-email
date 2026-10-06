import { describe, expect, test } from 'bun:test'

import { Style, css } from 'hono/css'
import { raw } from 'hono/html'

import { Body, Conditional, Head, Html, Tailwind, buildTailwindArtifactFromCss, render } from '../index'

const renderOptions = { doctype: false, minify: false, onWarning: 'error' } as const

describe('nested Tailwind', () => {
  test('preserves nested output inside an Outlook conditional comment', async () => {
    const outer = buildTailwindArtifactFromCss({ css: '.outer { color: #112233; }' })
    const inner = buildTailwindArtifactFromCss({ css: '.inner { color: #aabbcc; }' })

    const { html } = await render(
      <Tailwind artifact={outer}>
        <Conditional>
          <Tailwind artifact={inner}>
            <p className="inner">Inner</p>
          </Tailwind>
          <p className="unknown">Outlook sibling</p>
        </Conditional>
        <p className="outer">Visible</p>
      </Tailwind>,
      renderOptions,
    )

    expect(html).toBe(
      '<!--[if mso]><p class="inner" style="color:#aabbcc">Inner</p><p class="unknown">Outlook sibling</p><![endif]--><p class="outer" style="color:#112233">Visible</p>',
    )
    expect(html).not.toContain('hono-email-tw-processed')
  })

  test('applies only the nearest artifact and preserves classes and explicit styles', async () => {
    const outer = buildTailwindArtifactFromCss({
      css: '.outer { color: #112233; } .shared { background-color: #445566; }',
    })
    const inner = buildTailwindArtifactFromCss({
      css: '.inner { font-weight: 700; } .shared { color: #aabbcc; }',
    })

    const { html, text, warnings } = await render(
      <Tailwind artifact={outer}>
        <Body>
          <p className="outer">Outer</p>
          <Tailwind artifact={inner}>
            <p className="inner shared css-original" style={{ color: '#ff6600' }}>
              Inner
            </p>
          </Tailwind>
          <p className="outer">After</p>
        </Body>
      </Tailwind>,
      renderOptions,
    )

    expect(html).toBe(
      '<body><p class="outer" style="color:#112233">Outer</p><p class="inner shared css-original" style="font-weight:700;color:#ff6600">Inner</p><p class="outer" style="color:#112233">After</p></body>',
    )
    expect(text).toBe('Outer\n\nInner\n\nAfter')
    expect(warnings).toEqual([])
  })

  test('does not reapply a shared class even when both artifacts know it', async () => {
    const outer = buildTailwindArtifactFromCss({
      css: '.shared { color: #112233; background-color: #445566; }',
    })
    const inner = buildTailwindArtifactFromCss({ css: '.shared { color: #aabbcc; }' })

    const { html } = await render(
      <Tailwind artifact={outer}>
        <Tailwind artifact={inner}>
          <p className="shared">Inner</p>
        </Tailwind>
      </Tailwind>,
      renderOptions,
    )

    expect(html).toBe('<p class="shared" style="color:#aabbcc">Inner</p>')
  })

  test('supports the same artifact with renamed variants and retains head CSS once', async () => {
    const artifact = buildTailwindArtifactFromCss({
      css: `
.base { color: #112233; }
.hover\\:accent:hover { color: #aabbcc; }
.sm\\:accent { @media (width >= 40rem) { color: #445566; } }
`,
    })

    const { html } = await render(
      <Html>
        <Head />
        <Body>
          <Tailwind artifact={artifact}>
            <Tailwind artifact={artifact}>
              <p className="base hover:accent sm:accent">Inner</p>
            </Tailwind>
          </Tailwind>
        </Body>
      </Html>,
      renderOptions,
    )

    expect(html).toContain('<p class="base hover-accent sm:accent" style="color:#112233">Inner</p>')
    expect(html).toContain(
      '<head><meta charset="utf-8"><style data-hono-email-head="true">.hover-accent:hover{color:#aabbcc !important}@media (min-width:640px){.sm\\:accent{color:#445566 !important}}</style></head>',
    )
    expect(html.match(/<style\b/g)).toHaveLength(1)
    expect(html).not.toContain('hono-email-tw-processed')
  })

  test('supports deep nesting and resumes ownership for each following sibling', async () => {
    const first = buildTailwindArtifactFromCss({ css: '.first { color: #111111; }' })
    const second = buildTailwindArtifactFromCss({ css: '.second { color: #222222; }' })
    const third = buildTailwindArtifactFromCss({ css: '.third { color: #333333; }' })
    const fourth = buildTailwindArtifactFromCss({ css: '.fourth { color: #444444; }' })

    const { html } = await render(
      <Tailwind artifact={first}>
        <Tailwind artifact={second}>
          <Tailwind artifact={third}>
            <Tailwind artifact={fourth}>
              <p className="fourth">Four</p>
            </Tailwind>
            <p className="third">Three</p>
          </Tailwind>
          <p className="second">Two</p>
        </Tailwind>
        <p className="first">One</p>
      </Tailwind>,
      renderOptions,
    )

    expect(html).toBe(
      '<p class="fourth" style="color:#444444">Four</p><p class="third" style="color:#333333">Three</p><p class="second" style="color:#222222">Two</p><p class="first" style="color:#111111">One</p>',
    )
  })

  test('preserves warnings and head CSS from inner and outer artifacts', async () => {
    const outer = buildTailwindArtifactFromCss({
      css: '.hover\\:outer:hover { color: #112233; } .before\\:outer::before { color: #445566; }',
    })
    const inner = buildTailwindArtifactFromCss({
      css: '.hover\\:inner:hover { color: #aabbcc; } .before\\:inner::before { color: #ddeeff; }',
    })

    const { html, warnings } = await render(
      <Html>
        <Head />
        <Body>
          <Tailwind artifact={outer}>
            <p className="hover:outer before:outer">Outer</p>
            <Tailwind artifact={inner}>
              <p className="hover:inner before:inner">Inner</p>
            </Tailwind>
          </Tailwind>
        </Body>
      </Html>,
      { ...renderOptions, onWarning: 'silent' },
    )

    expect(warnings).toEqual([
      "Tailwind class 'before:outer' uses an unsupported selector (combinator or pseudo-element) and was dropped.",
      "Tailwind class 'before:inner' uses an unsupported selector (combinator or pseudo-element) and was dropped.",
    ])
    expect(html).toContain('.hover-outer:hover{color:#112233 !important}')
    expect(html).toContain('.hover-inner:hover{color:#aabbcc !important}')
    expect(html).toContain(
      '<body><p class="hover-outer">Outer</p><p class="hover-inner">Inner</p></body>',
    )
    expect(html.match(/<style\b/g)).toHaveLength(2)
    expect(html).not.toContain('hono-email-tw-warning')
    expect(html).not.toContain('hono-email-tw-processed')
  })

  test.each(['before', 'after'])(
    'rejects missing classes in an unprocessed sibling %s nesting',
    async (position) => {
      const outer = buildTailwindArtifactFromCss({ css: '.outer { color: #112233; }' })
      const inner = buildTailwindArtifactFromCss({ css: '.inner { color: #aabbcc; }' })

      await expect(
        render(
          <Tailwind artifact={outer}>
            {position === 'before' && <p className="missing">Missing</p>}
            <Tailwind artifact={inner}>
              <p className="inner">Inner</p>
            </Tailwind>
            {position === 'after' && <p className="missing">Missing</p>}
          </Tailwind>,
          renderOptions,
        ),
      ).rejects.toThrow("Tailwind class 'missing' is missing from the build artifact.")
    },
  )

  test('rejects an inner missing class even when the outer artifact knows it', async () => {
    const outer = buildTailwindArtifactFromCss({ css: '.outer { color: #112233; }' })
    const inner = buildTailwindArtifactFromCss({ css: '.inner { color: #aabbcc; }' })

    await expect(
      render(
        <Tailwind artifact={outer}>
          <Tailwind artifact={inner}>
            <p className="outer">Missing from inner</p>
          </Tailwind>
        </Tailwind>,
        renderOptions,
      ),
    ).rejects.toThrow("Tailwind class 'outer' is missing from the build artifact.")
  })

  test('preserves source inside a nested table fragment and still applies hono/css', async () => {
    const outer = buildTailwindArtifactFromCss({ css: '.outer { color: #112233; }' })
    const inner = buildTailwindArtifactFromCss({ css: '.inner { color: #aabbcc; }' })
    const className = css`
      font-weight: 700;
    `

    const { html } = await render(
      <Html>
        <Head>
          <Style />
        </Head>
        <Body>
          <Tailwind artifact={outer}>
            <table className="outer">
              <tbody>
                <Tailwind artifact={inner}>
                  {raw("<!--keep--><tr><td data-label='A &amp; B' class='inner'>Cell</td></tr>")}
                  <tr>
                    <td className={className}>Styled</td>
                  </tr>
                </Tailwind>
              </tbody>
            </table>
          </Tailwind>
        </Body>
      </Html>,
      renderOptions,
    )

    expect(html).toContain(
      "<!--keep--><tr><td data-label='A &amp; B' class='inner' style=\"color:#aabbcc\">Cell</td></tr>",
    )
    expect(html).toContain('style="font-weight:700">Styled</td>')
    expect(html).not.toContain('hono-email-tw-processed')
    expect(html).not.toContain('id="hono-css"')
  })
})
