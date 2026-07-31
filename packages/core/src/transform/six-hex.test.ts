import { describe, expect, spyOn, test } from 'bun:test'

import * as csstree from '../css/csstree'
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

  test('does not expand hash fragments inside url()', () => {
    expect(expandShortHex('filter:url(#abc)')).toBe('filter:url(#abc)')
    expect(expandShortHex("src:url('font.woff2#abc')")).toBe("src:url('font.woff2#abc')")
  })

  test('expands colors but leaves url() fragments alone in the same value', () => {
    expect(expandShortHex('color:#abc;background:url(#def)')).toBe(
      'color:#aabbcc;background:url(#def)',
    )
  })
})

describe('ensureSixHex', () => {
  test('expands hex inside style attributes', () => {
    expect(ensureSixHex('<p style="color:#abc">Hi</p>')).toBe('<p style="color:#aabbcc">Hi</p>')
  })

  test('expands hex inside style blocks', () => {
    expect(ensureSixHex('<style>.a{color:#abc}</style>')).toBe('<style>.a{color:#aabbcc}</style>')
  })

  test('expands declaration values without changing id selectors', () => {
    expect(
      ensureSixHex(
        '<style>#abc { color: #def; } @media screen { #abc { border: 1px solid #abc; } }</style>',
      ),
    ).toBe(
      '<style>#abc { color: #ddeeff; } @media screen { #abc { border: 1px solid #aabbcc; } }</style>',
    )
  })

  test('does not touch non-css hex such as anchors', () => {
    expect(ensureSixHex('<a href="#abc">Jump</a>')).toBe('<a href="#abc">Jump</a>')
  })

  test('expands hex across the whole style block when CSS parsing fails', () => {
    // css-tree's stylesheet parser recovers from malformed input, so no real
    // input makes collectCssDeclarations throw. Spy to force the fallback:
    // hex inside declarations must still be expanded, even outside selectors.
    const spy = spyOn(csstree, 'collectCssDeclarations').mockImplementation(() => {
      throw new Error('synthetic parse failure')
    })
    try {
      expect(ensureSixHex('<style>#abc { color: #def; }</style>')).toBe(
        '<style>#aabbcc { color: #ddeeff; }</style>',
      )
    } finally {
      spy.mockRestore()
    }
  })
})
