import { describe, expect, test } from 'vitest'
import { connect } from 'cloudflare:sockets'

import { cloudflareSmtpConnector } from '../../src/adapter/cloudflare/smtp'

describe('cloudflareSmtpConnector runtime smoke', () => {
  test('resolves cloudflare:sockets in the Workers test runtime', () => {
    expect(typeof connect).toBe('function')
  })

  test('rejects outbound SMTP port 25 before opening a socket', async () => {
    await expect(
      cloudflareSmtpConnector.connect(
        { hostname: 'smtp.example.com', port: 25 },
        { secureTransport: 'off' },
      ),
    ).rejects.toThrow('port 25')
  })
})
