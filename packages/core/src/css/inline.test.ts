import { describe, expect, test } from 'bun:test'

import { buildCssArtifact } from './artifact'
import { collectCssClassesFromHtml, inlineCssArtifact, wrapGeneratedHeadCss } from './inline'

describe('inlineCssArtifact', () => {
  test('uses CSS declaration order and preserves explicit style precedence', async () => {
    const artifact = buildCssArtifact({
      css: '.padding { padding: 1rem; color: red; } .top { padding-top: 2rem; }',
    })

    expect(
      await inlineCssArtifact(
        '<p class="top padding custom" style="color:blue">Hello</p>',
        artifact,
      ),
    ).toEqual({
      html: '<p class="top padding custom" style="padding:16px;padding-top:32px;color:blue">Hello</p>',
      headCss: '',
      droppedClasses: [],
    })
  })

  test('keeps used head rules in document order and renames pseudo-class tokens', async () => {
    const artifact = buildCssArtifact({
      css: `
.hover\\:brand:hover { color: red; }
@media (width >= 40rem) { .wide { color: blue; } }
.unused:focus { color: green; }
`,
    })

    expect(
      await inlineCssArtifact(
        '<p class="wide hover:brand">Hello</p><p class="hover:brand wide">Again</p>',
        artifact,
      ),
    ).toEqual({
      html: '<p class="wide hover-brand">Hello</p><p class="hover-brand wide">Again</p>',
      headCss:
        '@media (min-width:640px){.wide{color:blue !important}}.hover-brand:hover{color:red !important}',
      droppedClasses: [],
    })
  })

  test('reports only used unsupported classes once, in document order', async () => {
    const artifact = buildCssArtifact({
      css: '.parent > .child { color: red; } .before::before { content: "x"; } .unused::after { content: "y"; }',
    })

    expect(
      await inlineCssArtifact(
        '<p class="before child custom">Hello</p><p class="child before">Again</p>',
        artifact,
      ),
    ).toEqual({
      html: '<p class="custom">Hello</p><p>Again</p>',
      headCss: '',
      droppedClasses: ['before', 'child'],
    })
  })

  test('preserves markers by default and removes only an explicitly requested attribute', async () => {
    const artifact = buildCssArtifact({ css: '' })
    const html = '<p data-parent-required="" data-other="keep">Hello</p>'

    expect(await inlineCssArtifact(html, artifact)).toEqual({
      html,
      headCss: '',
      droppedClasses: [],
    })
    expect(
      await inlineCssArtifact(html, artifact, { removeAttribute: 'data-parent-required' }),
    ).toEqual({
      html: '<p data-other="keep">Hello</p>',
      headCss: '',
      droppedClasses: [],
    })
  })

  test('lets callers reject missing classes with their own error', async () => {
    await expect(
      inlineCssArtifact('<p class="missing">Hello</p>', buildCssArtifact({ css: '' }), {
        onMissingClass(className) {
          throw new Error(`Unknown CSS class: ${className}`)
        },
      }),
    ).rejects.toThrow('Unknown CSS class: missing')
  })
})

test('collects raw class tokens in document order', async () => {
  expect(
    await collectCssClassesFromHtml(
      '<p class="second first second">Hi</p><p class="third&#32;first">Again</p>',
    ),
  ).toEqual(['second', 'first', 'third&#32;first'])
})

test('wraps only nonempty head CSS', () => {
  expect(wrapGeneratedHeadCss('')).toBe('')
  expect(wrapGeneratedHeadCss('.brand:hover{color:red}')).toBe(
    '<style data-hono-email-head="true">.brand:hover{color:red}</style>',
  )
})
