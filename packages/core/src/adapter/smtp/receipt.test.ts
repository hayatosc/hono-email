import { describe, expect, test } from 'bun:test'

import * as smtp from '.'
import { SmtpTransportClosedError } from './receipt'

describe('SmtpTransportClosedError', () => {
  test('identifies the lifecycle error by name and message', () => {
    const error = new SmtpTransportClosedError()

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('SmtpTransportClosedError')
    expect(error.message).toBe('SMTP transport is closed.')
    expect(String(error)).toBe('SmtpTransportClosedError: SMTP transport is closed.')
  })

  test('exports the lifecycle error for narrowing send and verify rejections', async () => {
    expect(smtp.SmtpTransportClosedError).toBe(SmtpTransportClosedError)

    const transport = new smtp.SmtpTransport({
      connector: {
        connect() {
          throw new Error('A closed transport must not connect.')
        },
      },
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
    })
    await transport.close()

    await expect(
      transport.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Closed transport',
        html: '<p>Hello</p>',
        text: 'Hello',
      }),
    ).rejects.toBeInstanceOf(smtp.SmtpTransportClosedError)
    await expect(transport.verify()).rejects.toBeInstanceOf(smtp.SmtpTransportClosedError)
  })
})
