import { describe, expect, test } from 'bun:test'

import { Body, Head, Html, Tailwind, Text, pixelBasedPreset, render, renderWithWarnings } from '../../src'

describe('Tailwind', () => {
  test('applies config-driven utilities as inline styles on html elements', async () => {
    const html = await render(
      <Html>
        <Head />
        <Tailwind
          config={{
            theme: {
              extend: {
                colors: {
                  brand: '#0f172a',
                },
              },
            },
          }}
        >
          <Body>
            <Text className='text-brand bg-brand px-4 py-2'>Hello</Text>
          </Body>
        </Tailwind>
      </Html>
    )

    expect(html).toContain('color:#0f172a')
    expect(html).toContain('background-color:#0f172a')
    expect(html).toContain('padding-left:16px')
    expect(html).toContain('padding-right:16px')
    expect(html).toContain('padding-top:8px')
    expect(html).toContain('padding-bottom:8px')
  })

  test('moves generated media query styles into head and reports warnings when needed', async () => {
    const result = await renderWithWarnings(
      <Html>
        <Head />
        <Tailwind>
          <Body>
            <Text className='text-slate-900 sm:text-blue-500'>Hello</Text>
          </Body>
        </Tailwind>
      </Html>
    )

    expect(result.html).toMatch(/<head[^>]*>[\s\S]*<style[^>]*>[\s\S]*@media[\s\S]*<\/style>[\s\S]*<\/head>/i)
    expect(result.warnings).toContain(
      "The CSS at-rule '@media' may not be supported consistently across email clients. Keep the base layout readable without media queries."
    )
  })

  test('supports pixelBasedPreset typography, border, tracking, and sizing utilities', async () => {
    const html = await render(
      <Html>
        <Head />
        <Tailwind
          config={{
            presets: [pixelBasedPreset],
          }}
        >
          <Body>
            <Text className='text-2xl font-semibold tracking-wide underline border border-slate-300 rounded-lg w-24 h-10 px-4 py-2'>
              Hello
            </Text>
          </Body>
        </Tailwind>
      </Html>
    )

    expect(html).toContain('font-size:24px')
    expect(html).toContain('line-height:32px')
    expect(html).toContain('font-weight:600')
    expect(html).toContain('letter-spacing:0.025em')
    expect(html).toContain('text-decoration:underline')
    expect(html).toContain('border-style:solid')
    expect(html).toContain('border-width:1px')
    expect(html).toContain('border-color:#cbd5e1')
    expect(html).toContain('border-radius:8px')
    expect(html).toContain('width:96px')
    expect(html).toContain('height:40px')
  })
})
