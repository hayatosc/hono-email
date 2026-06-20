import { describe, expect, test } from 'bun:test'

import {
  escapeSelector,
  normalizeCssValue,
  normalizeDeclarations,
  normalizeMediaQuery,
  resolveCssVariables,
} from './css'

describe('normalizeCssValue', () => {
  test('converts 1rem to 16px', () => {
    expect(normalizeCssValue('1rem')).toBe('16px')
  })

  test('converts 0.5rem to 8px', () => {
    expect(normalizeCssValue('0.5rem')).toBe('8px')
  })

  test('evaluates calc() with multiplication', () => {
    expect(normalizeCssValue('calc(4px * 3)')).toBe('12px')
  })

  test('evaluates calc() with division', () => {
    expect(normalizeCssValue('calc(12px / 3)')).toBe('4px')
  })

  test('evaluates calc() with unitless operands', () => {
    expect(normalizeCssValue('calc(6 * 7)')).toBe('42')
  })

  test('normalizes whitespace', () => {
    expect(normalizeCssValue('  1rem   2rem  ')).toBe('16px 32px')
  })
})

describe('resolveCssVariables', () => {
  test('resolves simple variable', () => {
    expect(resolveCssVariables('var(--color)', { '--color': 'red' })).toBe('red')
  })

  test('resolves nested variable', () => {
    expect(resolveCssVariables('var(--a)', { '--a': 'var(--b)', '--b': 'deep' })).toBe('deep')
  })

  test('uses fallback value for unknown variable', () => {
    expect(resolveCssVariables('var(--missing, blue)', {})).toBe('blue')
  })

  test('leaves unknown variable as-is when no fallback', () => {
    expect(resolveCssVariables('var(--unknown)', {})).toBe('var(--unknown)')
  })

  test('stops at maximum depth (8 levels)', () => {
    const vars: Record<string, string> = {}
    for (let i = 0; i < 10; i++) {
      vars[`--v${i}`] = i < 9 ? `var(--v${i + 1})` : 'final'
    }
    const result = resolveCssVariables('var(--v0)', vars)
    expect(result).not.toBe('final')
  })
})

describe('normalizeMediaQuery', () => {
  test('converts width >= to min-width', () => {
    expect(normalizeMediaQuery('(width >= 768px)')).toBe('(min-width:768px)')
  })

  test('converts width <= to max-width', () => {
    expect(normalizeMediaQuery('(width <= 1024px)')).toBe('(max-width:1024px)')
  })

  test('leaves other queries as-is', () => {
    expect(normalizeMediaQuery('(hover: hover)')).toBe('(hover: hover)')
  })
})

describe('normalizeDeclarations', () => {
  test('expands border-block to border-top and border-bottom', () => {
    const result = normalizeDeclarations({ 'border-block': '1px' }, {})
    expect(result['border-top']).toBe('1px')
    expect(result['border-bottom']).toBe('1px')
    expect(result['border-block']).toBeUndefined()
  })

  test('expands margin-inline to margin-left and margin-right', () => {
    const result = normalizeDeclarations({ 'margin-inline': '10px' }, {})
    expect(result['margin-left']).toBe('10px')
    expect(result['margin-right']).toBe('10px')
  })

  test('aliases text-decoration-line to text-decoration', () => {
    const result = normalizeDeclarations({ 'text-decoration-line': 'underline' }, {})
    expect(result['text-decoration']).toBe('underline')
    expect(result['text-decoration-line']).toBeUndefined()
  })

  test('normalizes rgb color on color property', () => {
    const result = normalizeDeclarations({ color: 'rgb(255 0 0)' }, {})
    expect(result['color']).toBe('#ff0000')
  })

  test('normalizes rgb with alpha 1 to hex', () => {
    const result = normalizeDeclarations({ 'background-color': 'rgb(0 128 255 / 1)' }, {})
    expect(result['background-color']).toBe('#0080ff')
  })

  test('normalizes oklch color', () => {
    const result = normalizeDeclarations({ color: 'oklch(50% 0.15 180)' }, {})
    expect(result['color']).toMatch(/^#[0-9a-f]{6}$/)
  })

  test('resolves --tw-* variables and removes them', () => {
    const result = normalizeDeclarations(
      {
        '--tw-border-opacity': '0.5',
        'border-color': 'var(--tw-border-opacity)',
      },
      {},
    )
    expect(result['--tw-border-opacity']).toBeUndefined()
    expect(result['border-color']).toBe('0.5')
  })

  test('skips empty property', () => {
    const result = normalizeDeclarations({ '': 'value' }, {})
    expect(Object.keys(result)).toHaveLength(0)
  })

  test('skips empty value', () => {
    const result = normalizeDeclarations({ color: '' }, {})
    expect(result['color']).toBeUndefined()
  })

  test('auto-inserts border-style when border-width is present', () => {
    const result = normalizeDeclarations({ 'border-width': '1px' }, {})
    expect(result['border-style']).toBe('solid')
  })

  test('does not auto-insert border-style if already set', () => {
    const result = normalizeDeclarations({ 'border-width': '1px', 'border-style': 'dashed' }, {})
    expect(result['border-style']).toBe('dashed')
  })

  test('resolves theme variables via resolveCssVariables', () => {
    const result = normalizeDeclarations(
      { color: 'var(--theme-color)' },
      { '--theme-color': '#abc123' },
    )
    expect(result['color']).toBe('#abc123')
  })
})

describe('escapeSelector', () => {
  test('escapes special characters', () => {
    expect(escapeSelector('a.b:c@d')).toBe('a\\.b\\:c\\@d')
  })

  test('leaves normal characters unchanged', () => {
    expect(escapeSelector('abc-123_XYZ')).toBe('abc-123_XYZ')
  })
})
