import { connect } from 'cloudflare:sockets'
import { describe, expect, test } from 'vitest'

import CloudflareConnector from '../../src/adapter/cloudflare/smtp'
import { SmtpTransport } from '../../src/adapter/smtp'

describe('cloudflareSmtpConnector runtime smoke', () => {
  test('resolves cloudflare:sockets in the Workers test runtime', () => {
    expect(typeof connect).toBe('function')
  })

  test('rejects outbound SMTP port 25 before opening a socket', async () => {
    const transport = new SmtpTransport({
      connector: CloudflareConnector,
      hostname: 'smtp.example.com',
      port: 25,
      secure: false,
    })

    const receipt = await transport.send({
      from: 'sender@example.com',
      html: '<p>Hello Cloudflare</p>',
      subject: 'Cloudflare runtime',
      text: 'Hello Cloudflare',
      to: 'recipient@example.com',
    })

    expect(receipt.successful).toBe(false)
    if (!receipt.successful) {
      expect(receipt.errorMessages.join('\n')).toContain('port 25')
    }
  })
})
