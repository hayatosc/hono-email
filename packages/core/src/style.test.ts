import { describe, expect, test } from 'bun:test'

import { mergeStyleAttributes } from './style'

describe('mergeStyleAttributes', () => {
  test('keeps explicit style declarations above additional declarations', () => {
    expect(mergeStyleAttributes('color:blue', { color: 'red', 'font-weight': '700' })).toBe(
      'font-weight:700;color:blue',
    )
  })

  test('preserves shorthand and longhand precedence', () => {
    expect(mergeStyleAttributes('padding:8px', { 'padding-top': '32px' })).toBe(
      'padding-top:32px;padding:8px',
    )
    expect(mergeStyleAttributes('padding-top:8px', { padding: '32px' })).toBe(
      'padding:32px;padding-top:8px',
    )
  })
})
