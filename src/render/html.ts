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
  const stream = await renderToReadableStream(jsx)
  return readStreamAsString(stream)
}
