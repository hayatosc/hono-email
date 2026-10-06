import { describe, expect, test } from 'bun:test'

import { Body, Button, Html, Preview, render, Text } from '../index'
import { renderPlainText } from './index'

describe('plain text HTML boundaries', () => {
  test.each([
    '<p title="1 > 0 <h1>attribute heading</h1>">Body</p>',
    "<p title='1 > 0 <img alt=attribute-image>'>Body</p>",
  ])('does not expose quoted attribute markup in %s', (html) => {
    expect(renderPlainText(html)).toBe('Body')
  })

  test('reads link and image attributes after quoted greater-than signs', () => {
    expect(
      renderPlainText(
        '<p><a title="a > b" href="https://example.com?a=1&amp;b=2">Link</a> <img title="a > b" alt="Logo &amp; badge"></p>',
      ),
    ).toBe('Link (https://example.com?a=1&b=2) Logo & badge')
  })

  test('does not close a link at an apparent closing tag inside an attribute', () => {
    expect(
      renderPlainText('<a href="https://example.com"><span title="</a>">Label</span></a>'),
    ).toBe('Label (https://example.com)')
  })

  test('preserves literal markup and greater-than signs in image alt text', () => {
    expect(renderPlainText('<img alt="Logo <b>large</b> &amp; 2 > 1">')).toBe(
      'Logo <b>large</b> & 2 > 1',
    )
  })

  test('excludes the entire nested preview subtree and preserves following content', () => {
    expect(
      renderPlainText(
        '<div data-hono-email-preview="true">Hidden<div>Inner</div>Tail<a href="https://hidden.example">Hidden link</a><img alt="Hidden image"><br><div data-hono-email-preview="true">Nested</div>End</div><p>Visible</p>',
      ),
    ).toBe('Visible')
  })

  test.each(["'true'", 'true'])(
    'recognizes a preview marker with the attribute value %s',
    (value) => {
      expect(
        renderPlainText(`<div title="a > b" data-hono-email-preview=${value}>Hidden</div>Visible`),
      ).toBe('Visible')
    },
  )

  test('does not treat a preview marker inside another attribute as hidden content', () => {
    expect(renderPlainText(`<div title='data-hono-email-preview="true"'>Visible</div>`)).toBe(
      'Visible',
    )
  })

  test('preserves literal less-than signs', () => {
    expect(renderPlainText('<p>1 < 2 > 0</p>')).toBe('1 < 2 > 0')
  })

  test('preserves incomplete tag boundaries as literal text', () => {
    expect(renderPlainText('Before <p title="unfinished > <b>Literal</b>')).toBe(
      'Before <p title="unfinished > <b>Literal</b>',
    )
  })

  test('skips an unclosed comment through the end of the input', () => {
    expect(renderPlainText('Visible<!-- Hidden > <p>Still hidden</p>')).toBe('Visible')
  })

  test.each(['style', 'script'])(
    'excludes unclosed %s content through the end of the input',
    (tag) => {
      expect(renderPlainText(`<p>Visible</p><${tag}>Hidden <b>Still hidden</b>`)).toBe('Visible')
    },
  )

  test('skips declarations containing quoted greater-than signs', () => {
    expect(renderPlainText('<!DOCTYPE html PUBLIC "a > b"><p>Visible</p>')).toBe('Visible')
  })
})

describe('plain text formatting compatibility', () => {
  const html =
    '<h2>Account <em>summary</em></h2><p>Hello <a href="https://example.com"><strong>world</strong></a><br>Next</p><ul><li>One</li><li>Two<img alt="!"></li></ul><hr>'

  test('preserves default headings, lists, links, images, and separators', () => {
    expect(renderPlainText(html)).toBe(
      'ACCOUNT SUMMARY\n\nHello world (https://example.com)\nNext\n\n- One\n- Two!\n---',
    )
  })

  test('preserves custom formatting and image exclusion options', () => {
    expect(
      renderPlainText(html, {
        headingStyle: 'preserve',
        hrSeparator: '***',
        includeImageAlt: false,
        linkFormat: 'text-only',
        listBullet: '*',
      }),
    ).toBe('Account summary\n\nHello world\nNext\n\n* One\n* Two\n***')
  })

  test.each([
    ['text-and-href', 'Label (https://example.com?a=1&b=2)'],
    ['href-only', 'https://example.com?a=1&b=2'],
    ['text-only', 'Label'],
  ] as const)('preserves the %s link format for nested inline labels', (linkFormat, expected) => {
    expect(
      renderPlainText('<a href="https://example.com?a=1&amp;b=2"><em>Label</em></a>', {
        linkFormat,
      }),
    ).toBe(expected)
  })

  describe.each([
    [
      'text-and-href',
      [
        ['<em> Label</em>', 'Before Label (https://example.com)After'],
        ['<em>Label </em>', 'BeforeLabel (https://example.com)After'],
        ['<span> <strong>Label</strong> </span>', 'Before Label (https://example.com)After'],
        [' \n<span> Label </span> \t', 'Before Label (https://example.com)After'],
      ],
    ],
    [
      'href-only',
      [
        ['<em> Label</em>', 'Beforehttps://example.comAfter'],
        ['<em>Label </em>', 'Beforehttps://example.comAfter'],
        ['<span> <strong>Label</strong> </span>', 'Beforehttps://example.comAfter'],
        [' \n<span> Label </span> \t', 'Beforehttps://example.comAfter'],
      ],
    ],
    [
      'text-only',
      [
        ['<em> Label</em>', 'Before LabelAfter'],
        ['<em>Label </em>', 'BeforeLabel After'],
        ['<span> <strong>Label</strong> </span>', 'Before Label After'],
        [' \n<span> Label </span> \t', 'Before Label After'],
      ],
    ],
  ] as const)('link label whitespace (%s)', (linkFormat, cases) => {
    for (const [label, expected] of cases) {
      test(`preserves whitespace inside inline children: ${label}`, () => {
        expect(
          renderPlainText(`<p>Before<a href="https://example.com">${label}</a>After</p>`, {
            linkFormat,
          }),
        ).toBe(expected)
      })
    }
  })

  test.each([
    ['text-and-href', 'BeforeLabel (https://example.com)After', 'Beforehttps://example.comAfter'],
    ['href-only', 'Beforehttps://example.comAfter', 'Beforehttps://example.comAfter'],
    ['text-only', 'BeforeLabelAfter', 'BeforeAfter'],
  ] as const)(
    'preserves direct link label trimming and empty labels with %s',
    (linkFormat, expectedLabel, expectedEmpty) => {
      expect(
        renderPlainText('<p>Before<a href="https://example.com"> \nLabel \t</a>After</p>', {
          linkFormat,
        }),
      ).toBe(expectedLabel)
      expect(
        renderPlainText('<p>Before<a href="https://example.com"> \t </a>After</p>', {
          linkFormat,
        }),
      ).toBe(expectedEmpty)
    },
  )

  test('preserves empty link labels and anchors without href attributes', () => {
    expect(renderPlainText('<a href="https://example.com"></a> <a>Label</a>')).toBe(
      'https://example.com Label',
    )
  })

  test('excludes closed CSS and scripts containing apparent tags', () => {
    expect(
      renderPlainText(
        '<style>.x::after { content: "<h1>CSS</h1>"; }</style><script>const html = "<div>Script</div>";</script><p>Visible</p>',
      ),
    ).toBe('Visible')
  })

  test('excludes hidden Outlook payloads and includes revealed payloads once', () => {
    expect(
      renderPlainText(
        '<!-- ordinary --><!--[if mso]><p>Outlook only</p><![endif]--><!--[if !mso]><!--><p>Visible</p><!--<![endif]-->',
      ),
    ).toBe('Visible')
  })

  test('preserves entity decoding and invalid entities', () => {
    expect(renderPlainText('<p>&copy; &#169; &#x1F600; &nbsp; &unknown; &#0; &#x110000;</p>')).toBe(
      '© © 😀 &unknown; &#0; &#x110000;',
    )
  })
})

describe('render output', () => {
  test('returns plain text with render options', async () => {
    const { text } = await render(
      <Html>
        <Body>
          <h1>Welcome</h1>
          <p>
            Hello <a href="https://example.com">world</a>
          </p>
        </Body>
      </Html>,
      {
        doctype: false,
        text: { headingStyle: 'preserve', linkFormat: 'text-only' },
      },
    )

    expect(text).toContain('Welcome')
    expect(text).toContain('Hello world')
    expect(text).not.toContain('https://example.com')
  })

  test('supports plain text formatting options', async () => {
    const { text } = await render(
      <Html>
        <Body>
          <h1>Welcome</h1>
          <p>
            Hello <a href="https://example.com">world</a>
          </p>
          <img src="https://example.com/image.png" alt="Hero image" />
          <ul>
            <li>One</li>
          </ul>
          <hr />
        </Body>
      </Html>,
      {
        doctype: false,
        text: {
          headingStyle: 'preserve',
          hrSeparator: '***',
          linkFormat: 'href-only',
          listBullet: '*',
        },
      },
    )

    expect(text).toContain('Welcome')
    expect(text).not.toContain('WELCOME')
    expect(text).toContain('Hello https://example.com')
    expect(text).toContain('Hero image')
    expect(text).toContain('* One')
    expect(text).toContain('***')
  })

  test('preserves link URLs for all valid href quoting styles', () => {
    const text = renderPlainText(
      "<p>Single <a href='https://single.example'>link</a> and unquoted <a href=https://unquoted.example>link</a>.</p>",
    )

    expect(text).toContain(
      'Single link (https://single.example) and unquoted link (https://unquoted.example).',
    )

    expect(
      renderPlainText("<p>Before <img alt='single alt'> after <img alt=unquoted-alt> after.</p>"),
    ).toBe('Before single alt after unquoted-alt after.')
  })

  test('prefers the real href over a preceding data-href', () => {
    const text = renderPlainText(
      '<p><a data-href="https://tracker.example/BAD" href="https://real.example/GOOD">Click</a></p>',
    )

    expect(text).toContain('Click (https://real.example/GOOD)')
    expect(text).not.toContain('tracker.example')
  })

  test('prefers the real alt over a preceding data-alt', () => {
    const text = renderPlainText('<img data-alt="BAD" alt="GOOD" src="x">', {
      includeImageAlt: true,
    })

    expect(text).toBe('GOOD')
  })

  test('ignores href syntax that appears inside another attribute value', () => {
    const text = renderPlainText(
      `<a title=" href='https://evil.example' " href="https://real.example">C</a>`,
    )

    expect(text).toContain('C (https://real.example)')
    expect(text).not.toContain('evil.example')
  })

  test('ignores alt syntax that appears inside another attribute value', () => {
    const text = renderPlainText(`<img title=" alt='BAD' " alt="GOOD" src="x">`, {
      includeImageAlt: true,
    })

    expect(text).toBe('GOOD')
  })

  test('decodes HTML entities in plain text', async () => {
    const { text } = await render(
      <Html>
        <Body>
          <Text>Thanks for signing up &amp; joining us.</Text>
          <Text>Price: 10&nbsp;USD &copy; 2026</Text>
        </Body>
      </Html>,
      { doctype: false, strict: false },
    )

    expect(text).toContain('Thanks for signing up & joining us.')
    expect(text).toContain('Price: 10 USD © 2026')
    expect(text).not.toContain('&amp;')
    expect(text).not.toContain('&nbsp;')
    expect(text).not.toContain('&copy;')
  })

  test('decodes named entities beyond the common subset', async () => {
    const { text } = await render(
      <Html>
        <Body>
          <Text>caf&eacute; &rarr; t&ouml;r</Text>
          <Text>&frac12; &amp; &#x1F600;</Text>
        </Body>
      </Html>,
      { doctype: false, strict: false },
    )

    expect(text).toContain('café → tör')
    expect(text).toContain('½ & 😀')
    expect(text).not.toMatch(/&[a-z]+;/i)
  })

  test('preserves author-provided zero-width and bidi characters', async () => {
    const { text } = await render(
      <Html>
        <Body>
          <Text>{'a‍b‎c'}</Text>
        </Body>
      </Html>,
      { doctype: false, strict: false },
    )

    expect(text).toContain('a‍b‎c')
  })

  test('strips HTML comments and Outlook MSO markup from plain text', async () => {
    const { text } = await render(
      <Html>
        <Body>
          <Button href="https://example.com" style={{ padding: '12px 16px' }}>
            Get started
          </Button>
        </Body>
      </Html>,
      { doctype: false, strict: false },
    )

    expect(text).toContain('Get started (https://example.com)')
    expect(text).not.toContain('&#8202;')
    expect(text).not.toContain('&#8203;')
    expect(text).not.toContain('[if mso]')
  })

  test('uppercases only real headings, not ordinary paragraphs', async () => {
    const { text } = await render(
      <Html>
        <Body>
          <h2>Account summary</h2>
          <Text>See you soon</Text>
          <Text>Best regards</Text>
        </Body>
      </Html>,
      { doctype: false },
    )

    expect(text).toContain('ACCOUNT SUMMARY')
    expect(text).toContain('See you soon')
    expect(text).not.toContain('SEE YOU SOON')
    expect(text).toContain('Best regards')
    expect(text).not.toMatch(/[]/)
  })

  test('preserves heading casing under headingStyle: preserve', async () => {
    const { text } = await render(
      <Html>
        <Body>
          <h1>Welcome aboard</h1>
          <Text>Glad you are here</Text>
        </Body>
      </Html>,
      { doctype: false, text: { headingStyle: 'preserve' } },
    )

    expect(text).toContain('Welcome aboard')
    expect(text).not.toContain('WELCOME ABOARD')
    expect(text).not.toMatch(/[]/)
  })
  test('excludes hidden preview content and padding from plain text', async () => {
    const { text } = await render(
      <Html>
        <Body>
          <Preview>Hidden preheader text</Preview>
          <Text>Visible body</Text>
        </Body>
      </Html>,
      { doctype: false },
    )

    expect(text).toContain('Visible body')
    expect(text).not.toContain('Hidden preheader text')
    expect(text).not.toMatch(/[\u200b\u200c\u200d]/)
  })
})
