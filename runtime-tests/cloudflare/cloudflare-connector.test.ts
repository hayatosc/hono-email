import { connect } from 'cloudflare:sockets'
import { withEnv } from 'cloudflare:workers'
import { describe, expect, test } from 'vitest'

import { WorkersConnector } from '../../src/adapter/platform/cloudflare/email-service'
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
  test('WorkersConnector reads env.EMAIL without arguments', async () => {
    const binding: CloudflareEmailBinding = {
      async send() {
        return { messageId: 'workers-env-id' }
      },
    }

    const receipt = await withEnv({ EMAIL: binding }, () =>
      WorkersConnector().send({
        from: 'sender@example.com',
        html: '<p>Hello Workers</p>',
        subject: 'Workers runtime test',
        text: 'Hello Workers',
        to: 'recipient@example.com',
      }),
    )

    expect(receipt.successful).toBe(true)
    if (receipt.successful) {
      expect(receipt.messageId).toBe('workers-env-id')
      expect(receipt.accepted).toEqual(['recipient@example.com'])
    }
  })

  test('WorkersConnector tolerates preview bindings that omit EmailSendResult', async () => {
    const binding: CloudflareEmailBinding = {
      async send() {
        // @ts-expect-error - testing fallback for preview bindings that return undefined
        return undefined
      },
    }

    const receipt = await withEnv({ EMAIL: binding }, () =>
      WorkersConnector().send({
        from: 'sender@example.com',
        html: '<p>Hello Workers</p>',
        subject: 'Workers runtime preview fallback',
        text: 'Hello Workers',
        to: 'recipient@example.com',
      }),
    )

    expect(receipt.successful).toBe(true)
    if (receipt.successful) {
      expect(receipt.accepted).toEqual(['recipient@example.com'])
      expect(receipt.messageId.length).toBeGreaterThan(0)
    }
  })
})
