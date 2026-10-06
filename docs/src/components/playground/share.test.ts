import { describe, expect, test } from 'bun:test'

import { decodeSourceFromHash, encodeSourceToHash } from './share'

describe('share hash', () => {
  test('round-trips source, including non-ASCII text', async () => {
    const source = 'export default () => <p>こんにちは 👋 a+b/c=d</p>\n'.repeat(20)
    const hash = await encodeSourceToHash(source)
    expect(hash).toMatch(/^#code\/[\w-]+$/)
    expect(await decodeSourceFromHash(hash)).toBe(source)
  })

  test('ignores unrelated or corrupt hashes', async () => {
    expect(await decodeSourceFromHash('')).toBeUndefined()
    expect(await decodeSourceFromHash('#install')).toBeUndefined()
    expect(await decodeSourceFromHash('#code/not-deflate')).toBeUndefined()
  })
})
