import { describe, expect, test } from 'bun:test'

import { raw } from 'hono/html'
import { HtmlEscapedCallbackPhase } from 'hono/utils/html'

import { renderFragmentToHtml } from './html'

describe('renderFragmentToHtml', () => {
  const thrownValues = [
    new Error('Render failed'),
    'Render failed',
    { code: 'RENDER_FAILED' },
    null,
    false,
    0,
    undefined,
  ]

  test.each(thrownValues)(
    'rejects with the original synchronous thrown value: %p',
    async (error) => {
      const Broken = (): never => {
        throw error
      }

      await expect(renderFragmentToHtml(<Broken />)).rejects.toBe(error)
    },
  )

  test.each(thrownValues)(
    'rejects with the original asynchronous thrown value: %p',
    async (error) => {
      const Broken = async (): Promise<never> => {
        await Promise.resolve()
        throw error
      }

      await expect(renderFragmentToHtml(<Broken />)).rejects.toBe(error)
    },
  )

  test.each([HtmlEscapedCallbackPhase.BeforeStream, HtmlEscapedCallbackPhase.Stream])(
    'rejects when a rendering callback fails in phase %p',
    async (errorPhase) => {
      const error = new Error('Callback failed')
      const content = raw('<p>Draft</p>', [
        async ({ phase }) => {
          if (phase === errorPhase) {
            throw error
          }
          return ''
        },
      ])

      await expect(renderFragmentToHtml(content)).rejects.toBe(error)
    },
  )

  test('preserves the first callback failure even when it is undefined', async () => {
    const content = raw('<p>Draft</p>', [
      async ({ phase }) => {
        if (phase === HtmlEscapedCallbackPhase.Stream) {
          throw undefined
        }
        return ''
      },
      async ({ phase }) => {
        if (phase === HtmlEscapedCallbackPhase.Stream) {
          throw new Error('Later failure')
        }
        return ''
      },
    ])

    await expect(renderFragmentToHtml(content)).rejects.toBeUndefined()
  })

  test('awaits callbacks before and during streaming', async () => {
    const phases: number[] = []
    const content = raw('<p>Draft</p>', [
      async ({ phase, buffer }) => {
        await Promise.resolve()
        phases.push(phase)
        if (phase === HtmlEscapedCallbackPhase.BeforeStream && buffer) {
          buffer[0] += '<p>Before</p>'
          return ''
        }
        return '<p>After</p>'
      },
    ])

    expect(await renderFragmentToHtml(content)).toBe('<p>Draft</p><p>Before</p><p>After</p>')
    expect(phases).toEqual([HtmlEscapedCallbackPhase.BeforeStream, HtmlEscapedCallbackPhase.Stream])
  })
})
