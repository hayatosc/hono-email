import { describe, expect, test } from 'bun:test'

import { collectOpeningTags, extractConditionalCommentPayloads, stripHtmlComments } from './tags'

describe('validation tag boundaries', () => {
  test('collects source offsets and preserves existing attribute parsing', () => {
    expect(
      collectOpeningTags(`<A HREF='https://example.com' title="a > b" disabled X=one x=two>`),
    ).toEqual([
      {
        name: 'a',
        index: 0,
        endIndex: 65,
        attributes: new Map([
          ['href', 'https://example.com'],
          ['title', 'a > b'],
          ['disabled', undefined],
          ['x', 'two'],
        ]),
      },
    ])
  })

  test('ignores ordinary comments when collecting tags', () => {
    expect(collectOpeningTags('<!-- <form> --><p>Visible</p>').map((tag) => tag.name)).toEqual([
      'p',
    ])
  })

  test.each(['script', 'style', 'textarea', 'title'])(
    'does not collect apparent tags inside raw %s content',
    (tag) => {
      expect(
        collectOpeningTags(`<${tag}>"<form>"</${tag}><p>Visible</p>`).map(
          (opening) => opening.name,
        ),
      ).toEqual([tag, 'p'])
    },
  )

  test('removes only actual comments while preserving attribute and raw-text source', () => {
    expect(
      stripHtmlComments(
        '<!-- lead --><p title="<!-- value -->">Text</p><style>.x{content:"<!-- raw -->"}</style><!-- tail -->',
      ),
    ).toBe('<p title="<!-- value -->">Text</p><style>.x{content:"<!-- raw -->"}</style>')
  })

  test('ignores an unclosed ordinary comment through EOF', () => {
    expect(stripHtmlComments('<p>Visible</p><!-- <form>')).toBe('<p>Visible</p>')
  })

  test('does not extract conditional payloads from quoted attributes or raw text', () => {
    expect(
      extractConditionalCommentPayloads(
        `<p title='<!--[if mso]><form><![endif]-->'>Text</p><style>.x{content:"<!--[if mso]><form><![endif]-->"}</style>`,
      ),
    ).toEqual([])
  })

  test.each([
    '<!--[if mso]><a href="javascript:alert(1)">Open</a><![endif]-->',
    '<!--[if mso]><a href="javascript:alert(1)">Open</a>-->',
    '<!--[if mso]><a href="javascript:alert(1)">Open</a><![endif]',
    '<!--[if mso]><a href="javascript:alert(1)">Open</a>',
  ])('extracts conditional payloads even with incomplete closing boundaries: %s', (html) => {
    expect(extractConditionalCommentPayloads(html)).toEqual([
      '<a href="javascript:alert(1)">Open</a>',
    ])
  })
})
