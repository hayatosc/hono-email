import assert from 'node:assert/strict'

import { connect } from 'cloudflare:sockets'
import { withEnv } from 'cloudflare:workers'
import { describe, expect, test } from 'vitest'

import { CloudflareEmailAdapter } from '../../packages/core/src/adapter/cloudflare/adapter'
import type { CloudflareEmailBinding } from '../../packages/core/src/adapter/platform/cloudflare/index'
import {
  createWorkersConnector,
  WorkersConnector,
} from '../../packages/core/src/adapter/platform/cloudflare/index'
import CloudflareConnector from '../../packages/core/src/adapter/platform/cloudflare/smtp'
import { SmtpTransport } from '../../packages/core/src/adapter/smtp'

function runWithEnv<T>(env: object, run: () => Promise<T>): Promise<T> {
  let result: Promise<T> | undefined
  withEnv(env, () => {
    result = run()
  })
  assert(result)
  return result
}

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

    assert(!receipt.successful)
    expect(receipt.errorMessages.join('\n')).toContain('port 25')
  })
})

describe('Cloudflare email adapters in Workers runtime', () => {
  test('WorkersConnector reads env.EMAIL without arguments', async () => {
    const binding: CloudflareEmailBinding = {
      async send() {
        return { messageId: 'workers-env-id' }
      },
    }

    const receipt = await runWithEnv({ EMAIL: binding }, () =>
      CloudflareEmailAdapter({ connector: WorkersConnector }).send({
        from: 'sender@example.com',
        html: '<p>Hello Workers</p>',
        subject: 'Workers runtime test',
        text: 'Hello Workers',
        to: 'recipient@example.com',
      }),
    )

    assert(receipt.successful)
    expect(receipt.messageId).toBe('workers-env-id')
    expect(receipt.accepted).toEqual(['recipient@example.com'])
  })

  test('WorkersConnector tolerates preview bindings that omit EmailSendResult', async () => {
    const binding = { send: async () => undefined }

    const receipt = await runWithEnv({ EMAIL: binding }, () =>
      CloudflareEmailAdapter({ connector: WorkersConnector }).send({
        from: 'sender@example.com',
        html: '<p>Hello Workers</p>',
        subject: 'Workers runtime preview fallback',
        text: 'Hello Workers',
        to: 'recipient@example.com',
      }),
    )

    assert(receipt.successful)
    expect(receipt.accepted).toEqual(['recipient@example.com'])
    expect(receipt.messageId.length).toBeGreaterThan(0)
  })

  test('createWorkersConnector reads a custom binding name', async () => {
    const binding: CloudflareEmailBinding = {
      async send(payload) {
        assert('subject' in payload)
        expect(payload.subject).toBe('Workers custom binding')
        return { messageId: 'custom-binding-id' }
      },
    }

    const receipt = await runWithEnv({ CUSTOM_EMAIL: binding }, () =>
      CloudflareEmailAdapter({
        connector: createWorkersConnector({
          bindingName: 'CUSTOM_EMAIL',
        }),
      }).send({
        from: 'sender@example.com',
        html: '<p>Hello Workers</p>',
        subject: 'Workers custom binding',
        text: 'Hello Workers',
        to: 'recipient@example.com',
      }),
    )

    assert(receipt.successful)
    expect(receipt.messageId).toBe('custom-binding-id')
    expect(receipt.response).toBe('Cloudflare Email Service accepted 1 recipient(s).')
  })
})
