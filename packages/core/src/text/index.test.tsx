import { describe, expect, test } from 'bun:test'

import { Body, Button, Html, Preview, render, Text } from '../index'
import { renderPlainText } from './index'

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
