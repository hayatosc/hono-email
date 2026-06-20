import { describe, test, expect } from 'bun:test'

import {
  encodeAttachmentContentBase64,
  resolveEmailAttachments,
  resolveEmailAttachmentsSync,
} from './attachment'

type MockFetch = {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>
  preconnect: (
    url: string | URL,
    options?: { dns?: boolean; tcp?: boolean; http?: boolean; https?: boolean },
  ) => void
}

const createMockFetch = (
  handler: (url: string | URL | Request, init?: RequestInit) => Promise<Response>,
): MockFetch => {
  return Object.assign(handler, { preconnect: () => {} })
}

describe('encodeAttachmentContentBase64', () => {
  test('empty Uint8Array returns empty string', () => {
    expect(encodeAttachmentContentBase64(new Uint8Array([]))).toBe('')
  })

  test('single byte', () => {
    expect(encodeAttachmentContentBase64(new Uint8Array([0x41]))).toBe('QQ==')
  })

  test('two bytes (one padding)', () => {
    expect(encodeAttachmentContentBase64(new Uint8Array([0x41, 0x42]))).toBe('QUI=')
  })

  test('three bytes (no padding)', () => {
    expect(encodeAttachmentContentBase64(new Uint8Array([0x41, 0x42, 0x43]))).toBe('QUJD')
  })

  test('Hello -> SGVsbG8=', () => {
    const bytes = new TextEncoder().encode('Hello')
    expect(encodeAttachmentContentBase64(bytes)).toBe('SGVsbG8=')
  })

  test('known value: empty bytes', () => {
    expect(encodeAttachmentContentBase64(new Uint8Array([0, 0, 0]))).toBe('AAAA')
  })

  test('known value: 0xFF bytes', () => {
    expect(encodeAttachmentContentBase64(new Uint8Array([0xff, 0xff, 0xff]))).toBe('////')
  })
})

describe('decodeStringContent via resolveEmailAttachments', () => {
  test('base64 encoding decodes correctly', async () => {
    const result = await resolveEmailAttachments([
      { content: 'SGVsbG8=', encoding: 'base64', filename: 'test.txt' },
    ])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
  })

  test('base64 with whitespace decodes correctly', async () => {
    const result = await resolveEmailAttachments([
      { content: 'SGVs\nbG8=', encoding: 'base64', filename: 'test.txt' },
    ])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
  })

  test('invalid base64 throws', async () => {
    expect(
      resolveEmailAttachments([
        { content: '!!!invalid!!!', encoding: 'base64', filename: 'test.txt' },
      ]),
    ).rejects.toThrow('invalid base64')
  })

  test('hex encoding decodes correctly', async () => {
    const result = await resolveEmailAttachments([
      { content: '48656c6c6f', encoding: 'hex', filename: 'test.txt' },
    ])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
  })

  test('hex with whitespace decodes correctly', async () => {
    const result = await resolveEmailAttachments([
      { content: '4865 6c6c 6f', encoding: 'hex', filename: 'test.txt' },
    ])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
  })

  test('invalid hex characters throw', async () => {
    expect(
      resolveEmailAttachments([{ content: 'ZZZZ', encoding: 'hex', filename: 'test.txt' }]),
    ).rejects.toThrow('invalid hex')
  })

  test('odd-length hex throws', async () => {
    expect(
      resolveEmailAttachments([{ content: '48656c6c6', encoding: 'hex', filename: 'test.txt' }]),
    ).rejects.toThrow('invalid hex')
  })

  test('no encoding treats content as UTF-8', async () => {
    const result = await resolveEmailAttachments([{ content: 'Hello UTF-8', filename: 'test.txt' }])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello UTF-8')
  })

  test('utf8 encoding treats content as UTF-8', async () => {
    const result = await resolveEmailAttachments([
      { content: 'Hello', encoding: 'utf8', filename: 'test.txt' },
    ])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
  })
})

describe('inferContentType', () => {
  test('infers jpg as image/jpeg', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', filename: 'photo.jpg' }])
    expect(result[0]!.contentType).toBe('image/jpeg')
  })

  test('infers png as image/png', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', filename: 'image.png' }])
    expect(result[0]!.contentType).toBe('image/png')
  })

  test('infers pdf as application/pdf', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', filename: 'doc.pdf' }])
    expect(result[0]!.contentType).toBe('application/pdf')
  })

  test('infers html as text/html', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', filename: 'page.html' }])
    expect(result[0]!.contentType).toBe('text/html')
  })

  test('infers json as application/json', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', filename: 'data.json' }])
    expect(result[0]!.contentType).toBe('application/json')
  })

  test('unknown extension falls back to application/octet-stream', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', filename: 'file.xyz' }])
    expect(result[0]!.contentType).toBe('application/octet-stream')
  })

  test('no extension falls back to application/octet-stream', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', filename: 'noext' }])
    expect(result[0]!.contentType).toBe('application/octet-stream')
  })

  test('extension at end of string with path', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', path: '/tmp/file.csv' }])
    expect(result[0]!.contentType).toBe('text/csv')
  })

  test('explicit contentType takes precedence', async () => {
    const result = await resolveEmailAttachments([
      { content: 'x', filename: 'file.jpg', contentType: 'custom/type' },
    ])
    expect(result[0]!.contentType).toBe('custom/type')
  })
})

describe('filenameFromPath', () => {
  test('unix path extracts filename', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', path: '/tmp/docs/report.pdf' }])
    expect(result[0]!.filename).toBe('report.pdf')
  })

  test('windows path extracts filename', async () => {
    const result = await resolveEmailAttachments([
      { content: 'x', path: 'C:\\Users\\docs\\report.pdf' },
    ])
    expect(result[0]!.filename).toBe('report.pdf')
  })

  test('path with query string strips query', async () => {
    const result = await resolveEmailAttachments([
      { content: 'x', path: 'https://example.com/file.pdf?token=abc' },
    ])
    expect(result[0]!.filename).toBe('file.pdf')
  })

  test('path with hash strips hash', async () => {
    const result = await resolveEmailAttachments([
      { content: 'x', path: 'https://example.com/file.pdf#section' },
    ])
    expect(result[0]!.filename).toBe('file.pdf')
  })

  test('empty path yields no filename', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', path: '' }])
    expect(result[0]!.filename).toBeUndefined()
  })

  test('explicit filename overrides path', async () => {
    const result = await resolveEmailAttachments([
      { content: 'x', path: '/tmp/original.pdf', filename: 'custom.pdf' },
    ])
    expect(result[0]!.filename).toBe('custom.pdf')
  })
})

describe('resolveEmailAttachments - content types', () => {
  test('Uint8Array content', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const result = await resolveEmailAttachments([{ content: bytes, filename: 'test.bin' }])
    expect(result[0]!.content).toEqual(bytes)
  })

  test('ArrayBuffer content', async () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer
    const result = await resolveEmailAttachments([{ content: buffer, filename: 'test.bin' }])
    expect(result[0]!.content).toEqual(new Uint8Array([1, 2, 3]))
  })

  test('ReadableStream content', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([72, 101, 108, 108, 111]))
        controller.close()
      },
    })
    const result = await resolveEmailAttachments([{ content: stream, filename: 'test.txt' }])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
  })

  test('ReadableStream with multiple chunks', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([72, 101]))
        controller.enqueue(new Uint8Array([108, 108, 111]))
        controller.close()
      },
    })
    const result = await resolveEmailAttachments([{ content: stream, filename: 'test.txt' }])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
  })
})

describe('resolveEmailAttachments - data URI', () => {
  test('plain text data URI', async () => {
    const result = await resolveEmailAttachments([{ path: 'data:text/plain,Hello%20World' }])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello World')
    expect(result[0]!.contentType).toBe('text/plain')
  })

  test('base64 data URI', async () => {
    const result = await resolveEmailAttachments([{ path: 'data:image/png;base64,SGVsbG8=' }])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
    expect(result[0]!.contentType).toBe('image/png')
  })

  test('data URI without content type', async () => {
    const result = await resolveEmailAttachments([{ path: 'data:;base64,SGVsbG8=' }])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
    expect(result[0]!.contentType).toBe('application/octet-stream')
  })

  test('data URI without base64 flag', async () => {
    const result = await resolveEmailAttachments([{ path: 'data:text/plain,plain text' }])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('plain text')
    expect(result[0]!.contentType).toBe('text/plain')
  })
})

describe('resolveEmailAttachments - fetch', () => {
  test('HTTP URL fetches content', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = createMockFetch(async () => {
      return new Response('fetched content', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    })
    try {
      const result = await resolveEmailAttachments([{ path: 'http://example.com/file.txt' }])
      expect(new TextDecoder().decode(result[0]!.content)).toBe('fetched content')
      expect(result[0]!.contentType).toBe('text/plain')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('HTTPS URL fetches content', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = createMockFetch(async () => {
      return new Response('secure content', {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      })
    })
    try {
      const result = await resolveEmailAttachments([{ path: 'https://example.com/file.pdf' }])
      expect(new TextDecoder().decode(result[0]!.content)).toBe('secure content')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('href fetches content', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = createMockFetch(async () => {
      return new Response('href content', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    })
    try {
      const result = await resolveEmailAttachments([{ href: 'https://example.com/file.txt' }])
      expect(new TextDecoder().decode(result[0]!.content)).toBe('href content')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('fetch with httpHeaders passes headers', async () => {
    const originalFetch = globalThis.fetch
    let capturedInit: RequestInit | undefined
    globalThis.fetch = createMockFetch(async (_url, init) => {
      capturedInit = init
      return new Response('content', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    })
    try {
      await resolveEmailAttachments([
        { href: 'https://example.com/file.txt', httpHeaders: { Authorization: 'Bearer token' } },
      ])
      expect(capturedInit).toBeDefined()
      const headers = capturedInit?.headers
      if (headers && typeof headers === 'object' && 'Authorization' in headers) {
        expect(headers.Authorization).toBe('Bearer token')
      }
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('fetch non-ok response throws', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = createMockFetch(async () => {
      return new Response('not found', { status: 404, statusText: 'Not Found' })
    })
    try {
      expect(resolveEmailAttachments([{ href: 'https://example.com/missing' }])).rejects.toThrow(
        '404',
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('fetch with content-length exceeding limit throws', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = createMockFetch(async () => {
      return new Response('content', {
        status: 200,
        headers: { 'content-type': 'text/plain', 'content-length': '1000' },
      })
    })
    try {
      expect(
        resolveEmailAttachments([{ href: 'https://example.com/large' }], {
          maxAttachmentSize: 100,
        }),
      ).rejects.toThrow('maxAttachmentSize')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('fetch with null body uses arrayBuffer', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = createMockFetch(async () => {
      return new Response(null, {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    })
    try {
      const result = await resolveEmailAttachments([{ href: 'https://example.com/empty' }])
      expect(result[0]!.content).toEqual(new Uint8Array(0))
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('fetch undefined throws', async () => {
    const originalFetch = globalThis.fetch
    // @ts-expect-error testing missing fetch
    globalThis.fetch = undefined
    try {
      expect(resolveEmailAttachments([{ href: 'https://example.com/file.txt' }])).rejects.toThrow(
        'fetch implementation',
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('resolveEmailAttachments - errors', () => {
  test('local file path throws', async () => {
    expect(resolveEmailAttachments([{ path: '/tmp/local-file.pdf' }])).rejects.toThrow(
      'Local attachment paths',
    )
  })

  test('missing content/path/href throws', async () => {
    expect(resolveEmailAttachments([{ filename: 'test.txt' }])).rejects.toThrow(
      'content, path, or href',
    )
  })

  test('undefined attachments returns empty array', async () => {
    const result = await resolveEmailAttachments(undefined)
    expect(result).toEqual([])
  })

  test('empty attachments array returns empty array', async () => {
    const result = await resolveEmailAttachments([])
    expect(result).toEqual([])
  })
})

describe('resolveEmailAttachments - maxAttachmentSize', () => {
  test('invalid maxAttachmentSize (zero) throws', async () => {
    expect(
      resolveEmailAttachments([{ content: 'x', filename: 'test.txt' }], { maxAttachmentSize: 0 }),
    ).rejects.toThrow('positive integer')
  })

  test('invalid maxAttachmentSize (negative) throws', async () => {
    expect(
      resolveEmailAttachments([{ content: 'x', filename: 'test.txt' }], { maxAttachmentSize: -1 }),
    ).rejects.toThrow('positive integer')
  })

  test('invalid maxAttachmentSize (float) throws', async () => {
    expect(
      resolveEmailAttachments([{ content: 'x', filename: 'test.txt' }], { maxAttachmentSize: 1.5 }),
    ).rejects.toThrow('positive integer')
  })

  test('content exceeding limit throws', async () => {
    expect(
      resolveEmailAttachments([{ content: 'Hello World', filename: 'test.txt' }], {
        maxAttachmentSize: 5,
      }),
    ).rejects.toThrow('maxAttachmentSize')
  })

  test('content within limit succeeds', async () => {
    const result = await resolveEmailAttachments([{ content: 'Hi', filename: 'test.txt' }], {
      maxAttachmentSize: 100,
    })
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hi')
  })
})

describe('resolveEmailAttachments - disposition and cid', () => {
  test('default disposition is attachment', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', filename: 'test.txt' }])
    expect(result[0]!.contentDisposition).toBe('attachment')
  })

  test('cid sets disposition to inline', async () => {
    const result = await resolveEmailAttachments([
      { content: 'x', filename: 'test.png', cid: 'img001' },
    ])
    expect(result[0]!.contentDisposition).toBe('inline')
    expect(result[0]!.cid).toBe('img001')
  })

  test('explicit contentDisposition overrides default', async () => {
    const result = await resolveEmailAttachments([
      { content: 'x', filename: 'test.txt', contentDisposition: 'inline' },
    ])
    expect(result[0]!.contentDisposition).toBe('inline')
  })

  test('explicit contentDisposition overrides cid default', async () => {
    const result = await resolveEmailAttachments([
      { content: 'x', filename: 'test.txt', cid: 'cid1', contentDisposition: 'attachment' },
    ])
    expect(result[0]!.contentDisposition).toBe('attachment')
    expect(result[0]!.cid).toBe('cid1')
  })
})

describe('resolveEmailAttachments - headers', () => {
  test('custom headers are preserved', async () => {
    const result = await resolveEmailAttachments([
      { content: 'x', filename: 'test.txt', headers: { 'X-Custom': 'value' } },
    ])
    expect(result[0]!.headers).toEqual({ 'X-Custom': 'value' })
  })

  test('no headers yields undefined headers', async () => {
    const result = await resolveEmailAttachments([{ content: 'x', filename: 'test.txt' }])
    expect(result[0]!.headers).toBeUndefined()
  })
})

describe('resolveEmailAttachmentsSync', () => {
  test('string content with base64 encoding', () => {
    const result = resolveEmailAttachmentsSync([
      { content: 'SGVsbG8=', encoding: 'base64', filename: 'test.txt' },
    ])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
  })

  test('string content with hex encoding', () => {
    const result = resolveEmailAttachmentsSync([
      { content: '48656c6c6f', encoding: 'hex', filename: 'test.txt' },
    ])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
  })

  test('string content with no encoding (UTF-8)', () => {
    const result = resolveEmailAttachmentsSync([{ content: 'Hello', filename: 'test.txt' }])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
  })

  test('Uint8Array content', () => {
    const bytes = new Uint8Array([1, 2, 3])
    const result = resolveEmailAttachmentsSync([{ content: bytes, filename: 'test.bin' }])
    expect(result[0]!.content).toEqual(bytes)
  })

  test('ArrayBuffer content', () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer
    const result = resolveEmailAttachmentsSync([{ content: buffer, filename: 'test.bin' }])
    expect(result[0]!.content).toEqual(new Uint8Array([1, 2, 3]))
  })

  test('data URI path', () => {
    const result = resolveEmailAttachmentsSync([{ path: 'data:text/plain,Hello%20Sync' }])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello Sync')
    expect(result[0]!.contentType).toBe('text/plain')
  })

  test('base64 data URI path', () => {
    const result = resolveEmailAttachmentsSync([{ path: 'data:image/png;base64,SGVsbG8=' }])
    expect(new TextDecoder().decode(result[0]!.content)).toBe('Hello')
    expect(result[0]!.contentType).toBe('image/png')
  })

  test('ReadableStream throws (requires async)', () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1]))
        controller.close()
      },
    })
    expect(() => resolveEmailAttachmentsSync([{ content: stream, filename: 'test.bin' }])).toThrow(
      'async',
    )
  })

  test('HTTP URL path throws (requires async)', () => {
    expect(() => resolveEmailAttachmentsSync([{ path: 'http://example.com/file.txt' }])).toThrow(
      'async',
    )
  })

  test('HTTPS URL path throws (requires async)', () => {
    expect(() => resolveEmailAttachmentsSync([{ path: 'https://example.com/file.txt' }])).toThrow(
      'async',
    )
  })

  test('href throws (requires async)', () => {
    expect(() => resolveEmailAttachmentsSync([{ href: 'https://example.com/file.txt' }])).toThrow(
      'async',
    )
  })

  test('local file path throws (requires async)', () => {
    expect(() => resolveEmailAttachmentsSync([{ path: '/tmp/local.pdf' }])).toThrow('async')
  })

  test('missing content/path/href throws', () => {
    expect(() => resolveEmailAttachmentsSync([{ filename: 'test.txt' }])).toThrow('async')
  })

  test('undefined attachments returns empty array', () => {
    expect(resolveEmailAttachmentsSync(undefined)).toEqual([])
  })

  test('empty attachments array returns empty array', () => {
    expect(resolveEmailAttachmentsSync([])).toEqual([])
  })

  test('maxAttachmentSize validation', () => {
    expect(() =>
      resolveEmailAttachmentsSync([{ content: 'Hello World', filename: 'test.txt' }], {
        maxAttachmentSize: 5,
      }),
    ).toThrow('maxAttachmentSize')
  })

  test('content disposition and cid', () => {
    const result = resolveEmailAttachmentsSync([
      { content: 'x', filename: 'test.png', cid: 'img001' },
    ])
    expect(result[0]!.contentDisposition).toBe('inline')
    expect(result[0]!.cid).toBe('img001')
  })

  test('content type inference from filename', () => {
    const result = resolveEmailAttachmentsSync([{ content: 'x', filename: 'photo.jpg' }])
    expect(result[0]!.contentType).toBe('image/jpeg')
  })
})

describe('resolveEmailAttachments - multiple attachments', () => {
  test('resolves multiple attachments', async () => {
    const result = await resolveEmailAttachments([
      { content: 'first', filename: 'a.txt' },
      { content: 'second', filename: 'b.txt' },
      { content: 'third', filename: 'c.txt' },
    ])
    expect(result).toHaveLength(3)
    expect(new TextDecoder().decode(result[0]!.content)).toBe('first')
    expect(new TextDecoder().decode(result[1]!.content)).toBe('second')
    expect(new TextDecoder().decode(result[2]!.content)).toBe('third')
  })
})
