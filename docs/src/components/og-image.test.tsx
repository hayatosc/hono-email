import { describe, expect, test } from 'bun:test'
import { renderToReadableStream } from 'hono/jsx/streaming'

import { OgImage } from './og-image'

describe('OgImage component', () => {
  test('renders title and description', async () => {
    const props = {
      title: 'Hello World',
      description: 'This is a description.',
    }
    const stream = await renderToReadableStream(OgImage(props))
    const html = await new Response(stream).text()

    expect(html).toContain('Hello World')
    expect(html).toContain('This is a description.')
    expect(html).toContain('hono-email')
    expect(html).toContain('https://hono-email.hayatosc.dev')
  })

  test('truncates long title and description', async () => {
    const props = {
      title: 'A'.repeat(100),
      description: 'B'.repeat(200),
    }
    const stream = await renderToReadableStream(OgImage(props))
    const html = await new Response(stream).text()

    const expectedTitle = 'A'.repeat(79) + '…'
    const expectedDescription = 'B'.repeat(159) + '…'

    expect(html).toContain(expectedTitle)
    expect(html).not.toContain('A'.repeat(100))
    expect(html).toContain(expectedDescription)
    expect(html).not.toContain('B'.repeat(200))
  })
})
