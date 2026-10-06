import { describe, expect, test } from 'bun:test'

import { relocatePreview } from './preview'

describe('relocatePreview', () => {
  test('inserts after the complete body tag with a quoted greater-than sign', () => {
    expect(
      relocatePreview(
        '<div data-hono-email-preview="true">Preview</div><body title="a > b">Visible</body>',
      ),
    ).toBe('<body title="a > b"><div data-hono-email-preview="true">Preview</div>Visible</body>')
  })

  test('recognizes the preview marker after a quoted greater-than sign', () => {
    expect(
      relocatePreview(
        '<div title="a > b" data-hono-email-preview="true">Preview</div><body>Visible</body>',
      ),
    ).toBe('<body><div title="a > b" data-hono-email-preview="true">Preview</div>Visible</body>')
  })

  test('preserves literal less-than signs and surrounding source during relocation', () => {
    expect(
      relocatePreview(
        '<!DOCTYPE html>1 < 2<div data-hono-email-preview="true">Preview < 3</div><body>Visible</body>',
      ),
    ).toBe(
      '<!DOCTYPE html>1 < 2<body><div data-hono-email-preview="true">Preview < 3</div>Visible</body>',
    )
  })

  test.each([
    '<!-- <body> -->',
    '<div title="<body>">Before</div>',
    '<style>.x{content:"<body>"}</style>',
    '<script>const html = "<body>";</script>',
  ])('ignores apparent body tags in %s', (prefix) => {
    const html = `${prefix}<div data-hono-email-preview="true">Preview</div><body>Visible</body>`
    expect(relocatePreview(html)).toBe(
      `${prefix}<body><div data-hono-email-preview="true">Preview</div>Visible</body>`,
    )
  })

  test.each(['script', 'style', 'textarea', 'title'])(
    'ignores apparent preview closing tags in raw %s content',
    (tag) => {
      const preview = `<div data-hono-email-preview="true"><${tag}>"</div><div>"</${tag}>Tail</div>`
      expect(relocatePreview(`${preview}<body>Visible</body>`)).toBe(
        `<body>${preview}Visible</body>`,
      )
    },
  )

  test('does not treat marker text inside another attribute as a preview', () => {
    const html = `<div title='data-hono-email-preview="true"'>Visible</div><body>Body</body>`
    expect(relocatePreview(html)).toBe(html)
  })

  test('leaves an incomplete preview subtree in place', () => {
    const html = '<body>Visible<div data-hono-email-preview="true">Preview'
    expect(relocatePreview(html)).toBe(html)
  })

  test.each(['script', 'style'])(
    'leaves apparent preview blocks inside raw %s content untouched',
    (tag) => {
      const html = `<${tag}>'<div data-hono-email-preview="true">Raw</div>'</${tag}><body>Visible</body>`
      expect(relocatePreview(html)).toBe(html)
    },
  )

  test('preserves multiple previews including self-closing source', () => {
    expect(
      relocatePreview(
        '<div data-hono-email-preview="true">First</div><div data-hono-email-preview="true"/><body>Visible</body>',
      ),
    ).toBe(
      '<body><div data-hono-email-preview="true">First</div><div data-hono-email-preview="true"/>Visible</body>',
    )
  })
})
