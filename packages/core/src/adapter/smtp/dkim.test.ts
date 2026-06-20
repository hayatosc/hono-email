import { describe, expect, test } from 'bun:test'

import { applyDkimSignature } from './dkim'

const CRLF = '\r\n'
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const bytesToBase64 = (bytes: Uint8Array): string => {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1] ?? 0
    const third = bytes[index + 2] ?? 0
    const combined = (first << 16) | (second << 8) | third

    output += BASE64_ALPHABET[(combined >> 18) & 0x3f]
    output += BASE64_ALPHABET[(combined >> 12) & 0x3f]
    output += index + 1 < bytes.length ? BASE64_ALPHABET[(combined >> 6) & 0x3f] : '='
    output += index + 2 < bytes.length ? BASE64_ALPHABET[combined & 0x3f] : '='
  }

  return output
}

const toPem = (label: string, bytes: Uint8Array): string => {
  const encoded = bytesToBase64(bytes)
  const lines: string[] = []
  for (let index = 0; index < encoded.length; index += 64) {
    lines.push(encoded.slice(index, index + 64))
  }

  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`
}

const createPkcs8Key = async (): Promise<string> => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
      modulusLength: 1024,
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ['sign', 'verify'],
  )

  const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  return toPem('PRIVATE KEY', new Uint8Array(pkcs8))
}

const createSampleMessage = (): string =>
  `From: sender@example.com\r\nTo: recipient@example.com\r\nSubject: Test\r\n\r\nHello world`

describe('applyDkimSignature', () => {
  test('signs a message with a PKCS#8 private key', async () => {
    const privateKey = await createPkcs8Key()
    const result = await applyDkimSignature(createSampleMessage(), {
      domainName: 'example.com',
      keySelector: 'test',
      privateKey,
    })

    expect(result).toStartWith('DKIM-Signature: ')
    expect(result).toContain('d=example.com')
    expect(result).toContain('s=test')
    expect(result).toContain('a=rsa-sha256')
    expect(result).toContain('c=relaxed/relaxed')
    expect(result).toContain('h=From:To:Subject')
    expect(result).toContain('bh=')
    expect(result).toContain('b=')
    expect(result).toContain(CRLF + createSampleMessage())
  })

  test('uses custom headerFieldNames', async () => {
    const privateKey = await createPkcs8Key()
    const result = await applyDkimSignature(createSampleMessage(), {
      domainName: 'example.com',
      keySelector: 'test',
      headerFieldNames: ['From', 'Subject'],
      privateKey,
    })

    expect(result).toContain('h=From:Subject')
    expect(result).not.toContain('h=From:To:Subject')
  })

  test('skips fields listed in skipFields', async () => {
    const privateKey = await createPkcs8Key()
    const result = await applyDkimSignature(createSampleMessage(), {
      domainName: 'example.com',
      keySelector: 'test',
      privateKey,
      skipFields: ['To'],
    })

    expect(result).toContain('h=From:Subject')
  })

  test('handles multiline header folding', async () => {
    const privateKey = await createPkcs8Key()
    const message =
      'From: sender@example.com\r\nTo: recipient@example.com\r\nSubject: A very long\r\n subject line\r\n\r\nBody text'

    const result = await applyDkimSignature(message, {
      domainName: 'example.com',
      keySelector: 'test',
      privateKey,
    })

    expect(result).toStartWith('DKIM-Signature: ')
  })

  test('normalizes LF line endings to CRLF', async () => {
    const privateKey = await createPkcs8Key()
    const message =
      'From: sender@example.com\nTo: recipient@example.com\nSubject: Test\n\nHello world'

    const result = await applyDkimSignature(message, {
      domainName: 'example.com',
      keySelector: 'test',
      privateKey,
    })

    expect(result).toStartWith('DKIM-Signature: ')
    const afterSignature = result.slice(result.indexOf('\r\n') + 2)
    expect(afterSignature).not.toMatch(/(?<!\r)\n/)
  })

  test('canonicalizes body with trailing whitespace and blank lines', async () => {
    const privateKey = await createPkcs8Key()
    const message = 'From: sender@example.com\r\nSubject: Test\r\n\r\nHello   \r\nWorld\r\n\r\n\r\n'

    const result = await applyDkimSignature(message, {
      domainName: 'example.com',
      keySelector: 'test',
      privateKey,
    })

    expect(result).toStartWith('DKIM-Signature: ')
  })

  test('throws for invalid domainName', async () => {
    const privateKey = await createPkcs8Key()
    await expect(
      applyDkimSignature(createSampleMessage(), {
        domainName: 'invalid domain',
        keySelector: 'test',
        privateKey,
      }),
    ).rejects.toThrow('Invalid DKIM domainName')
  })

  test('throws for invalid keySelector', async () => {
    const privateKey = await createPkcs8Key()
    await expect(
      applyDkimSignature(createSampleMessage(), {
        domainName: 'example.com',
        keySelector: 'invalid selector',
        privateKey,
      }),
    ).rejects.toThrow('Invalid DKIM keySelector')
  })

  test('throws for invalid header field name', async () => {
    const privateKey = await createPkcs8Key()
    await expect(
      applyDkimSignature(createSampleMessage(), {
        domainName: 'example.com',
        keySelector: 'test',
        headerFieldNames: ['Invalid Field'],
        privateKey,
      }),
    ).rejects.toThrow('Invalid DKIM header field name: Invalid Field')
  })

  test('throws for invalid header field name in skipFields', async () => {
    const privateKey = await createPkcs8Key()
    await expect(
      applyDkimSignature(createSampleMessage(), {
        domainName: 'example.com',
        keySelector: 'test',
        skipFields: ['Invalid Field'],
        privateKey,
      }),
    ).rejects.toThrow('Invalid DKIM header field name: Invalid Field')
  })

  test('throws when no headers match for signing', async () => {
    const privateKey = await createPkcs8Key()
    await expect(
      applyDkimSignature(createSampleMessage(), {
        domainName: 'example.com',
        keySelector: 'test',
        headerFieldNames: ['X-Nonexistent'],
        privateKey,
      }),
    ).rejects.toThrow('DKIM signing requires at least one signed header field.')
  })

  test('throws for message without header/body separator', async () => {
    const privateKey = await createPkcs8Key()
    await expect(
      applyDkimSignature('no separator here', {
        domainName: 'example.com',
        keySelector: 'test',
        privateKey,
      }),
    ).rejects.toThrow('missing header/body separator')
  })

  test('throws for PEM without valid markers', async () => {
    await expect(
      applyDkimSignature(createSampleMessage(), {
        domainName: 'example.com',
        keySelector: 'test',
        privateKey: 'not a pem',
      }),
    ).rejects.toThrow('expected PKCS#8 PRIVATE KEY or PKCS#1 RSA PRIVATE KEY PEM')
  })

  test('throws for PEM with invalid base64 data', async () => {
    await expect(
      applyDkimSignature(createSampleMessage(), {
        domainName: 'example.com',
        keySelector: 'test',
        privateKey: '-----BEGIN PRIVATE KEY-----\n!!!invalid!!!\n-----END PRIVATE KEY-----',
      }),
    ).rejects.toThrow('Invalid DKIM private key')
  })

  test('handles duplicate headers by signing them in reverse order', async () => {
    const privateKey = await createPkcs8Key()
    const message =
      'From: first@example.com\r\nFrom: second@example.com\r\nTo: recipient@example.com\r\nSubject: Test\r\n\r\nBody'

    const result = await applyDkimSignature(message, {
      domainName: 'example.com',
      keySelector: 'test',
      headerFieldNames: ['From', 'From'],
      privateKey,
    })

    expect(result).toStartWith('DKIM-Signature: ')
    expect(result).toContain('h=From:From')
  })

  test('handles empty body', async () => {
    const privateKey = await createPkcs8Key()
    const message = 'From: sender@example.com\r\nSubject: Test\r\n\r\n'

    const result = await applyDkimSignature(message, {
      domainName: 'example.com',
      keySelector: 'test',
      privateKey,
    })

    expect(result).toStartWith('DKIM-Signature: ')
  })
})
