import { describe, expect, test } from 'bun:test'

import * as smtp from '.'
import { SmtpCommandError } from './protocol'
import { classifySmtpFailure, failedReceipt, SmtpTransportClosedError } from './receipt'

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

describe('classifySmtpFailure and failedReceipt', () => {
  test('classifies SmtpCommandError with 5xx permanent reply and enhanced status code', () => {
    const error = new SmtpCommandError('RCPT TO:<bad@example.com>', {
      code: 550,
      lines: ['550 5.1.1 User unknown'],
    })

    expect(error.code).toBe(550)
    expect(error.enhancedCode).toBe('5.1.1')
    expect(error.permanent).toBe(true)

    const classification = classifySmtpFailure(error)
    expect(classification).toEqual({
      category: 'smtp',
      permanent: true,
      code: 550,
      enhancedCode: '5.1.1',
    })

    const receipt = failedReceipt(error)
    expect(receipt).toMatchObject({
      successful: false,
      category: 'smtp',
      permanent: true,
      code: 550,
      enhancedCode: '5.1.1',
      response: '550 5.1.1 User unknown',
    })
  })

  test('classifies SmtpCommandError with 4xx transient reply', () => {
    const error = new SmtpCommandError('DATA', {
      code: 451,
      lines: ['451 4.3.0 Mail server busy, try again later'],
    })

    expect(error.code).toBe(451)
    expect(error.enhancedCode).toBe('4.3.0')
    expect(error.permanent).toBe(false)

    const classification = classifySmtpFailure(error)
    expect(classification).toEqual({
      category: 'smtp',
      permanent: false,
      code: 451,
      enhancedCode: '4.3.0',
    })
  })

  test('classifies timeout errors as category timeout and permanent false', () => {
    const error = new Error('SMTP connection timed out after 5000ms.')
    const classification = classifySmtpFailure(error)
    expect(classification).toEqual({
      category: 'timeout',
      permanent: false,
    })
  })

  test('classifies validation errors as category validation and permanent true', () => {
    const error = new Error('Invalid SMTP recipient: must not contain CR, LF, or ">".')
    const classification = classifySmtpFailure(error)
    expect(classification).toEqual({
      category: 'validation',
      permanent: true,
    })
  })
})
