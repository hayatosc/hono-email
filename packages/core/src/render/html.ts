import type { Child } from 'hono/jsx'
import { renderToReadableStream } from 'hono/jsx/dom/server'

const readStreamAsString = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let html = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    html += decoder.decode(value, { stream: true })
  }

  html += decoder.decode()

  return html
}

export const renderFragmentToHtml = async (jsx: Child): Promise<string> => {
  const errors: unknown[] = []
  const stream = await renderToReadableStream(jsx, {
    onError: (error) => {
      errors.push(error)
    },
  })
  const html = await readStreamAsString(stream)

  // Hono closes the stream after reporting errors; let it drain before rejecting.
  if (errors.length > 0) {
    throw errors[0]
  }

  return html
}
