import { describe, expect, test } from 'bun:test'

import { buildCssArtifact } from './artifact'

describe('buildCssArtifact', () => {
  test('builds class-indexed declarations and selector metadata in CSS order', () => {
    expect(
      buildCssArtifact({
        css: `
.plain { color: red; padding-inline: 1rem; }
.plain { color: blue; }
.sm\\:plain { @media (width >= 40rem) { margin-block: 0.5rem; } }
.hover\\:plain:hover { color: red; }
.parent > .child { color: white; }
.before\\:plain::before { content: "x"; }
`,
      }),
    ).toEqual({
      classes: ['plain', 'sm:plain', 'hover:plain', 'parent', 'child', 'before:plain'],
      inlineStylesByClass: {
        plain: { color: 'blue', 'padding-left': '16px', 'padding-right': '16px' },
      },
      inlineStyleOrderByClass: {
        plain: { color: 1, 'padding-left': 0, 'padding-right': 0 },
      },
      headCssByClass: {
        'sm:plain':
          '@media (min-width:640px){.sm\\:plain{margin-top:8px !important;margin-bottom:8px !important}}',
        'hover:plain': '.hover-plain:hover{color:red !important}',
      },
      renamedClasses: { 'hover:plain': 'hover-plain' },
      droppedClasses: ['child', 'before:plain'],
    })
  })

  test('resolves theme and property variables before normalizing declarations', () => {
    const artifact = buildCssArtifact({
      css: `
@property --brand { initial-value: rgb(15 23 42); }
@layer theme { :root { --gap: 1.25rem; } }
.card { color: var(--brand); padding-inline: var(--gap); }
`,
    })

    expect(artifact.inlineStylesByClass).toEqual({
      card: { color: '#0f172a', 'padding-left': '20px', 'padding-right': '20px' },
    })
    expect(artifact.inlineStyleOrderByClass).toEqual({
      card: { color: 1, 'padding-left': 1, 'padding-right': 1 },
    })
  })
})
