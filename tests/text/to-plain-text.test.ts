import { describe, expect, test } from 'bun:test'

import { toPlainText } from '../../src'

describe('toPlainText', () => {
  test('converts basic email markup into readable text', () => {
    const text = toPlainText(
      '<!DOCTYPE html><html><body><h1>Welcome</h1><p>Hello <a href="https://example.com">world</a></p><ul><li>One</li><li>Two</li></ul><hr /></body></html>'
    )

    expect(text).toContain('WELCOME')
    expect(text).toContain('Hello world (https://example.com)')
    expect(text).toContain('- One')
    expect(text).toContain('- Two')
    expect(text).toContain('---')
  })

  test('supports plain text formatting options', () => {
    const text = toPlainText(
      '<!DOCTYPE html><html><body><h1>Welcome</h1><p>Hello <a href="https://example.com">world</a></p><img src="https://example.com/image.png" alt="Hero image" /><ul><li>One</li></ul><hr /></body></html>',
      {
        headingStyle: 'preserve',
        hrSeparator: '***',
        linkFormat: 'href-only',
        listBullet: '*',
      }
    )

    expect(text).toContain('Welcome')
    expect(text).not.toContain('WELCOME')
    expect(text).toContain('Hello https://example.com')
    expect(text).toContain('Hero image')
    expect(text).toContain('* One')
    expect(text).toContain('***')
  })
})
