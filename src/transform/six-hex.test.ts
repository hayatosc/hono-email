import { describe, expect, test } from 'bun:test'

import { ensureSixHex, expandShortHex } from './six-hex'

describe('expandShortHex', () => {
  test('expands three-digit hex to six digits', () => {
    expect(expandShortHex('color:#abc')).toBe('color:#aabbcc')
  })

  test('leaves six-digit hex untouched', () => {
    expect(expandShortHex('color:#aabbcc')).toBe('color:#aabbcc')
  })

  test('leaves four-digit hex untouched', () => {
    expect(expandShortHex('color:#abcd')).toBe('color:#abcd')
  })
})

describe('ensureSixHex', () => {
  test('expands hex inside style attributes', () => {
    expect(ensureSixHex('<p style="color:#abc">Hi</p>')).toBe('<p style="color:#aabbcc">Hi</p>')
  })

  test('expands hex inside style blocks', () => {
    expect(ensureSixHex('<style>.a{color:#abc}</style>')).toBe('<style>.a{color:#aabbcc}</style>')
  })

  test('does not touch non-css hex such as anchors', () => {
    expect(ensureSixHex('<a href="#abc">Jump</a>')).toBe('<a href="#abc">Jump</a>')
  })
})
