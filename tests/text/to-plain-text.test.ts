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
})
