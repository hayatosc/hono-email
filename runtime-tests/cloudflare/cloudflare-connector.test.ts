import { connect } from 'cloudflare:sockets'
import { describe, expect, test } from 'vitest'

import { WorkersConnector } from '../../src/adapter/cloudflare-email'
import type { CloudflareEmailBinding } from '../../src/adapter/platform/cloudflare/email-service'
import CloudflareConnector from '../../src/adapter/platform/cloudflare/smtp'
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

describe('Cloudflare email adapters in Workers runtime', () => {
  test('WorkersConnector sends through a mock binding', async () => {
    const binding: CloudflareEmailBinding = {
      async send() {
        return { messageId: 'workers-test-id' }
      },
    }

    const receipt = await WorkersConnector(binding).send({
      from: 'sender@example.com',
      html: '<p>Hello Workers</p>',
      subject: 'Workers runtime test',
      text: 'Hello Workers',
      to: 'recipient@example.com',
    })

    expect(receipt.successful).toBe(true)
    if (receipt.successful) {
      expect(receipt.messageId).toBe('workers-test-id')
      expect(receipt.accepted).toEqual(['recipient@example.com'])
    }
  })
})
